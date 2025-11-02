import { Command } from 'commander';
import { readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { readEpicFile, readFeatureFile, readTeamFile } from '../core/parser.js';
import { validateProject, formatValidationIssues } from '../utils/validation.js';

export const validateCommand = new Command('validate')
  .description('Validate project structure and data integrity')
  .argument('[id]', 'Optional: validate specific Epic or Feature')
  .action(async (id) => {
    const pmspaceDir = join(process.cwd(), 'pmspace');

    try {
      if (id) {
        await validateSpecific(pmspaceDir, id);
      } else {
        await validateAll(pmspaceDir);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function validateAll(pmspaceDir: string) {
  console.log(chalk.cyan('Validating project...\n'));

  // Read all Epics
  const epicsDir = join(pmspaceDir, 'epics');
  const epicFiles = await readdir(epicsDir);
  const epics = [];

  for (const file of epicFiles.filter(f => f.endsWith('.md'))) {
    const epic = await readEpicFile(join(epicsDir, file));
    epics.push(epic);
  }

  // Read all Features
  const featuresDir = join(pmspaceDir, 'features');
  const featureFiles = await readdir(featuresDir);
  const features = [];

  for (const file of featureFiles.filter(f => f.endsWith('.md'))) {
    const feature = await readFeatureFile(join(featuresDir, file));
    features.push(feature);
  }

  // Read Team (optional)
  let team;
  try {
    team = await readTeamFile(join(pmspaceDir, 'team.md'));
  } catch {
    // Team file not required
  }

  // Validate
  const result = validateProject(epics, features, team);

  console.log(formatValidationIssues(result));

  if (!result.valid) {
    process.exit(1);
  }
}

async function validateSpecific(pmspaceDir: string, id: string) {
  if (id.startsWith('EPIC-')) {
    const filePath = join(pmspaceDir, 'epics', `${id.toLowerCase()}.md`);
    const epic = await readEpicFile(filePath);
    console.log(chalk.green(`✓ ${epic.id} is valid`));
  } else if (id.startsWith('FEAT-')) {
    const filePath = join(pmspaceDir, 'features', `${id.toLowerCase()}.md`);
    const feature = await readFeatureFile(filePath);
    console.log(chalk.green(`✓ ${feature.id} is valid`));
  } else {
    console.error(chalk.red(`Invalid ID: ${id}`));
    process.exit(1);
  }
}
