import { Command } from 'commander';
import { readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { readEpicFile, readFeatureFile } from '../core/parser.js';

export const listCommand = new Command('list')
  .description('List Epics or Features')
  .argument('[type]', 'Type to list: epics or features', 'epics')
  .option('-s, --status <status>', 'Filter by status')
  .option('-a, --assignee <name>', 'Filter by assignee (features only)')
  .action(async (type, options) => {
    const pmspaceDir = join(process.cwd(), 'pmspace');

    try {
      if (type === 'epics') {
        await listEpics(pmspaceDir, options);
      } else if (type === 'features') {
        await listFeatures(pmspaceDir, options);
      } else {
        console.error(chalk.red(`Unknown type: ${type}. Use 'epics' or 'features'.`));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function listEpics(pmspaceDir: string, options: any) {
  const epicsDir = join(pmspaceDir, 'epics');
  const files = await readdir(epicsDir);
  const epicFiles = files.filter(f => f.endsWith('.md'));

  if (epicFiles.length === 0) {
    console.log(chalk.yellow('No Epics found.'));
    return;
  }

  const epics = [];
  for (const file of epicFiles) {
    const epic = await readEpicFile(join(epicsDir, file));
    if (!options.status || epic.status === options.status) {
      epics.push(epic);
    }
  }

  // Sort by ID
  epics.sort((a, b) => a.id.localeCompare(b.id));

  console.log(chalk.bold('\nEpics:\n'));
  console.log(
    chalk.gray(
      `${'ID'.padEnd(12)} ${'Title'.padEnd(30)} ${'Status'.padEnd(15)} ${'Owner'.padEnd(15)} ${'Est'.padEnd(8)} ${'Act'.padEnd(8)}`
    )
  );
  console.log(chalk.gray('-'.repeat(100)));

  for (const epic of epics) {
    const statusColor =
      epic.status === 'completed' ? chalk.green : epic.status === 'in-progress' ? chalk.yellow : chalk.white;

    console.log(
      `${epic.id.padEnd(12)} ${epic.title.substring(0, 30).padEnd(30)} ${statusColor(
        epic.status.padEnd(15)
      )} ${(epic.owner || '-').padEnd(15)} ${`${epic.estimate}h`.padEnd(8)} ${`${epic.actual}h`.padEnd(8)}`
    );
  }

  console.log(chalk.gray(`\nTotal: ${epics.length} Epic(s)`));
}

async function listFeatures(pmspaceDir: string, options: any) {
  const featuresDir = join(pmspaceDir, 'features');
  const files = await readdir(featuresDir);
  const featureFiles = files.filter(f => f.endsWith('.md'));

  if (featureFiles.length === 0) {
    console.log(chalk.yellow('No Features found.'));
    return;
  }

  const features = [];
  for (const file of featureFiles) {
    const feature = await readFeatureFile(join(featuresDir, file));
    let include = true;
    if (options.status && feature.status !== options.status) include = false;
    if (options.assignee && feature.assignee !== options.assignee) include = false;

    if (include) {
      features.push(feature);
    }
  }

  // Sort by ID
  features.sort((a, b) => a.id.localeCompare(b.id));

  console.log(chalk.bold('\nFeatures:\n'));
  console.log(
    chalk.gray(
      `${'ID'.padEnd(12)} ${'Title'.padEnd(30)} ${'Status'.padEnd(15)} ${'Assignee'.padEnd(15)} ${'Est'.padEnd(8)}`
    )
  );
  console.log(chalk.gray('-'.repeat(100)));

  for (const feature of features) {
    const statusColor =
      feature.status === 'done' ? chalk.green : feature.status === 'in-progress' ? chalk.yellow : chalk.white;

    console.log(
      `${feature.id.padEnd(12)} ${feature.title.substring(0, 30).padEnd(30)} ${statusColor(
        feature.status.padEnd(15)
      )} ${(feature.assignee || '-').padEnd(15)} ${`${feature.estimate}h`.padEnd(8)}`
    );
  }

  const totalHours = features.reduce((sum, f) => sum + f.estimate, 0);
  console.log(chalk.gray(`\nTotal: ${features.length} Feature(s), ${totalHours}h estimated`));
}
