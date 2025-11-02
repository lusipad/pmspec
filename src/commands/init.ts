import { Command } from 'commander';
import { mkdir, access, constants } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { writeProjectFile, writeTeamFile } from '../utils/markdown.js';
import type { Project, Team } from '../index.js';

export const initCommand = new Command('init')
  .description('Initialize a new PMSpec project')
  .option('-f, --force', 'Overwrite existing project')
  .action(async (options) => {
    const pmspaceDir = join(process.cwd(), 'pmspace');
    const epicsDir = join(pmspaceDir, 'epics');
    const featuresDir = join(pmspaceDir, 'features');

    // Check if already exists
    try {
      await access(pmspaceDir, constants.F_OK);
      if (!options.force) {
        console.error(chalk.red('PMSpec project already exists. Use --force to reinitialize.'));
        process.exit(1);
      }
    } catch {
      // Directory doesn't exist, proceed
    }

    const spinner = ora('Initializing PMSpec project...').start();

    try {
      // Create directories
      await mkdir(epicsDir, { recursive: true });
      await mkdir(featuresDir, { recursive: true });

      // Create template project.md
      const project: Project = {
        name: 'My Project',
        overview: 'Project overview goes here.',
        timeline: {
          start: new Date().toISOString().split('T')[0],
          end: '',
        },
        teamCapacity: {
          total: 0,
          available: 0,
        },
      };

      await writeProjectFile(join(pmspaceDir, 'project.md'), project);

      // Create template team.md
      const team: Team = {
        members: [],
      };

      await writeTeamFile(join(pmspaceDir, 'team.md'), team);

      spinner.succeed(chalk.green('PMSpec project initialized in pmspace/'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Edit pmspace/project.md to set up your project'));
      console.log(chalk.gray('  2. Edit pmspace/team.md to add team members'));
      console.log(chalk.gray('  3. Run `pmspec create epic` to create your first Epic'));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to initialize project'));
      throw error;
    }
  });
