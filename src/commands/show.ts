import { Command } from 'commander';
import { readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { readEpicFile, readFeatureFile, readMilestoneFile } from '../core/parser.js';

export const showCommand = new Command('show')
  .description('Show details of an Epic, Feature, or Milestone')
  .argument('<id>', 'ID of Epic, Feature, or Milestone (e.g., EPIC-001, FEAT-001, MILE-001)')
  .action(async (id) => {
    const pmspaceDir = join(process.cwd(), 'pmspace');

    try {
      if (id.startsWith('EPIC-')) {
        await showEpic(pmspaceDir, id);
      } else if (id.startsWith('FEAT-')) {
        await showFeature(pmspaceDir, id);
      } else if (id.startsWith('MILE-')) {
        await showMilestone(pmspaceDir, id);
      } else {
        console.error(chalk.red(`Invalid ID format: ${id}`));
        process.exit(1);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red(`${id} not found.`));
        process.exit(1);
      }
      throw error;
    }
  });

async function showEpic(pmspaceDir: string, id: string) {
  const filePath = join(pmspaceDir, 'epics', `${id.toLowerCase()}.md`);
  const epic = await readEpicFile(filePath);

  console.log(chalk.bold.cyan(`\n# Epic: ${epic.title}\n`));
  console.log(chalk.gray(`ID:       ${epic.id}`));
  console.log(chalk.gray(`Status:   ${epic.status}`));
  if (epic.owner) {
    console.log(chalk.gray(`Owner:    ${epic.owner}`));
  }
  console.log(chalk.gray(`Estimate: ${epic.estimate} hours`));
  console.log(chalk.gray(`Actual:   ${epic.actual} hours`));

  if (epic.description) {
    console.log(chalk.bold('\n## Description\n'));
    console.log(epic.description);
  }

  if (epic.features.length > 0) {
    console.log(chalk.bold('\n## Features\n'));
    // Calculate progress
    const featuresDir = join(pmspaceDir, 'features');
    const files = await readdir(featuresDir);
    const featureFiles = files.filter(f => f.endsWith('.md'));

    let completed = 0;
    for (const featureId of epic.features) {
      try {
        const filePath = join(featuresDir, `${featureId.toLowerCase()}.md`);
        const feature = await readFeatureFile(filePath);
        const checkbox = feature.status === 'done' ? '[x]' : '[ ]';
        console.log(`  ${checkbox} ${feature.id}: ${feature.title}`);
        if (feature.status === 'done') completed++;
      } catch {
        console.log(`  [ ] ${featureId}: [Not found]`);
      }
    }

    const progress = epic.features.length > 0 ? Math.round((completed / epic.features.length) * 100) : 0;
    console.log(chalk.gray(`\nProgress: ${completed}/${epic.features.length} (${progress}%)`));
  }

  console.log('');
}

async function showFeature(pmspaceDir: string, id: string) {
  const filePath = join(pmspaceDir, 'features', `${id.toLowerCase()}.md`);
  const feature = await readFeatureFile(filePath);

  console.log(chalk.bold.cyan(`\n# Feature: ${feature.title}\n`));
  console.log(chalk.gray(`ID:        ${feature.id}`));
  console.log(chalk.gray(`Epic:      ${feature.epicId}`));
  console.log(chalk.gray(`Status:    ${feature.status}`));
  if (feature.assignee) {
    console.log(chalk.gray(`Assignee:  ${feature.assignee}`));
  }
  console.log(chalk.gray(`Estimate:  ${feature.estimate} hours`));
  console.log(chalk.gray(`Actual:    ${feature.actual} hours`));
  if (feature.skillsRequired.length > 0) {
    console.log(chalk.gray(`Skills:    ${feature.skillsRequired.join(', ')}`));
  }

  if (feature.description) {
    console.log(chalk.bold('\n## Description\n'));
    console.log(feature.description);
  }

  if (feature.userStories.length > 0) {
    console.log(chalk.bold('\n## User Stories\n'));
    for (const story of feature.userStories) {
      const checkbox = story.status === 'done' ? '[x]' : '[ ]';
      console.log(`  ${checkbox} ${story.id}: ${story.title} (${story.estimate}h)`);
    }
  }

  if (feature.acceptanceCriteria.length > 0) {
    console.log(chalk.bold('\n## Acceptance Criteria\n'));
    for (const criterion of feature.acceptanceCriteria) {
      console.log(`  - [ ] ${criterion}`);
    }
  }

  if (feature.dependencies && feature.dependencies.length > 0) {
    console.log(chalk.bold('\n## Dependencies\n'));
    const blocks = feature.dependencies.filter(d => d.type === 'blocks');
    const relatesTo = feature.dependencies.filter(d => d.type === 'relates-to');
    
    if (blocks.length > 0) {
      console.log(chalk.gray(`  Blocks: ${blocks.map(d => d.featureId).join(', ')}`));
    }
    if (relatesTo.length > 0) {
      console.log(chalk.gray(`  Relates to: ${relatesTo.map(d => d.featureId).join(', ')}`));
    }
  }

  console.log('');
}

async function showMilestone(pmspaceDir: string, id: string) {
  const filePath = join(pmspaceDir, 'milestones', `${id.toLowerCase()}.md`);
  const milestone = await readMilestoneFile(filePath);

  console.log(chalk.bold.cyan(`\n# Milestone: ${milestone.title}\n`));
  console.log(chalk.gray(`ID:          ${milestone.id}`));
  console.log(chalk.gray(`Target Date: ${milestone.targetDate}`));
  console.log(chalk.gray(`Status:      ${milestone.status}`));

  if (milestone.description) {
    console.log(chalk.bold('\n## Description\n'));
    console.log(milestone.description);
  }

  if (milestone.features.length > 0) {
    console.log(chalk.bold('\n## Features\n'));
    const featuresDir = join(pmspaceDir, 'features');

    let completed = 0;
    for (const featureId of milestone.features) {
      try {
        const featurePath = join(featuresDir, `${featureId.toLowerCase()}.md`);
        const feature = await readFeatureFile(featurePath);
        const checkbox = feature.status === 'done' ? '[x]' : '[ ]';
        console.log(`  ${checkbox} ${feature.id}: ${feature.title}`);
        if (feature.status === 'done') completed++;
      } catch {
        console.log(`  [ ] ${featureId}: [Not found]`);
      }
    }

    const progress = milestone.features.length > 0 ? Math.round((completed / milestone.features.length) * 100) : 0;
    console.log(chalk.gray(`\nProgress: ${completed}/${milestone.features.length} (${progress}%)`));
  }

  console.log('');
}
