import { Command } from 'commander';
import chalk from 'chalk';
import { readEpicFile, readFeatureFile } from '../core/parser.js';
import { writeEpicFile, writeFeatureFile } from '../utils/markdown.js';
import { EpicStatus, FeatureStatus, StoryStatus } from '../core/project.js';
import { join } from 'path';
import { getChangelogService } from '../core/changelog-service.js';

const updateCommand = new Command('update')
  .description('Update status, actual hours, or assignee of existing items')
  .argument('<id>', 'ID of Epic, Feature, or Story to update')
  .option('-s, --status <status>', 'Update status')
  .option('-a, --actual <hours>', 'Update actual hours')
  .option('--assignee <name>', 'Update assignee (for Features)')
  .action(async (id, options, command) => {
    try {
      // Determine item type from ID
      const itemType = getItemType(id);

      if (itemType === 'epic') {
        await updateEpic(id, options);
      } else if (itemType === 'feature') {
        await updateFeature(id, options);
      } else if (itemType === 'story') {
        await updateStory(id, options);
      } else {
        console.error(chalk.red(`Error: Invalid ID format: ${id}`));
        console.error(chalk.yellow('Expected format: EPIC-001, FEAT-001, or STORY-001'));
        process.exit(1);
      }

    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function getItemType(id: string): 'epic' | 'feature' | 'story' | null {
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('FEAT-')) return 'feature';
  if (id.startsWith('STORY-')) return 'story';
  return null;
}

async function updateEpic(id: string, options: any) {
  const filePath = `pmspace/epics/${id.toLowerCase()}.md`;

  try {
    const epic = await readEpicFile(filePath);
    let changed = false;
    const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};

    // Update status
    if (options.status) {
      if (!EpicStatus.options.includes(options.status)) {
        console.error(chalk.red(`Error: Invalid status "${options.status}" for Epic`));
        console.error(chalk.yellow('Valid statuses:', EpicStatus.options.join(', ')));
        process.exit(1);
      }
      changes.status = { oldValue: epic.status, newValue: options.status };
      epic.status = options.status;
      changed = true;
      console.log(chalk.green(`✓ Updated ${id} status to ${options.status}`));
    }

    // Update actual hours
    if (options.actual !== undefined) {
      const actualHours = parseFloat(options.actual);
      if (isNaN(actualHours) || actualHours < 0) {
        console.error(chalk.red('Error: Actual hours must be a non-negative number'));
        process.exit(1);
      }
      changes.actual = { oldValue: epic.actual, newValue: actualHours };
      epic.actual = actualHours;
      changed = true;

      // Calculate variance
      const variance = epic.actual - epic.estimate;
      const variancePercent = ((variance / epic.estimate) * 100).toFixed(1);
      const varianceStr = variance >= 0 ? `+${variance}h (+${variancePercent}%)` : `${variance}h (${variancePercent}%)`;

      console.log(chalk.green(`✓ Updated ${id} actual hours to ${actualHours}h`));
      console.log(chalk.blue(`  Estimate: ${epic.estimate}h, Actual: ${epic.actual}h, Variance: ${varianceStr}`));
    }

    // Warn about unsupported options for epics
    if (options.assignee) {
      console.log(chalk.yellow(`Warning: Assignee cannot be set on Epics (use Features instead)`));
    }

    if (changed) {
      await writeEpicFile(filePath, epic);
      
      // Record changelog entries
      try {
        await getChangelogService().recordUpdates('epic', id, changes);
      } catch {
        // Silently fail if changelog can't be written
      }
    } else {
      console.log(chalk.yellow('No changes specified. Use --status, --actual, or --assignee'));
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(chalk.red(`Error: Epic ${id} not found`));
    } else {
      throw error;
    }
  }
}

async function updateFeature(id: string, options: any) {
  const filePath = `pmspace/features/${id.toLowerCase()}.md`;

  try {
    const feature = await readFeatureFile(filePath);
    let changed = false;
    const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};

    // Update status
    if (options.status) {
      if (!FeatureStatus.options.includes(options.status)) {
        console.error(chalk.red(`Error: Invalid status "${options.status}" for Feature`));
        console.error(chalk.yellow('Valid statuses:', FeatureStatus.options.join(', ')));
        process.exit(1);
      }
      changes.status = { oldValue: feature.status, newValue: options.status };
      feature.status = options.status;
      changed = true;
      console.log(chalk.green(`✓ Updated ${id} status to ${options.status}`));
    }

    // Update actual hours
    if (options.actual !== undefined) {
      const actualHours = parseFloat(options.actual);
      if (isNaN(actualHours) || actualHours < 0) {
        console.error(chalk.red('Error: Actual hours must be a non-negative number'));
        process.exit(1);
      }
      changes.actual = { oldValue: feature.actual, newValue: actualHours };
      feature.actual = actualHours;
      changed = true;

      // Calculate variance
      const variance = feature.actual - feature.estimate;
      const variancePercent = ((variance / feature.estimate) * 100).toFixed(1);
      const varianceStr = variance >= 0 ? `+${variance}h (+${variancePercent}%)` : `${variance}h (${variancePercent}%)`;

      console.log(chalk.green(`✓ Updated ${id} actual hours to ${actualHours}h`));
      console.log(chalk.blue(`  Estimate: ${feature.estimate}h, Actual: ${feature.actual}h, Variance: ${varianceStr}`));
    }

    // Update assignee
    if (options.assignee !== undefined) {
      changes.assignee = { oldValue: feature.assignee, newValue: options.assignee || undefined };
      feature.assignee = options.assignee || undefined;
      changed = true;
      if (feature.assignee) {
        console.log(chalk.green(`✓ Updated ${id} assignee to ${feature.assignee}`));
      } else {
        console.log(chalk.green(`✓ Removed assignee from ${id}`));
      }
    }

    if (changed) {
      await writeFeatureFile(filePath, feature);
      
      // Record changelog entries
      try {
        await getChangelogService().recordUpdates('feature', id, changes);
      } catch {
        // Silently fail if changelog can't be written
      }
    } else {
      console.log(chalk.yellow('No changes specified. Use --status, --actual, or --assignee'));
    }

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(chalk.red(`Error: Feature ${id} not found`));
    } else {
      throw error;
    }
  }
}

async function updateStory(id: string, options: any) {
  // Find the feature that contains this story
  let found = false;
  let featurePath = '';
  let feature: any = null;
  let storyIndex = -1;

  try {
    const featureFiles = await import('fs/promises').then(fs => fs.readdir('pmspace/features'));

    for (const file of featureFiles) {
      if (file.endsWith('.md')) {
        const path = join('pmspace/features', file);
        const f = await readFeatureFile(path);
        const storyIdx = f.userStories.findIndex((s: any) => s.id === id);

        if (storyIdx !== -1) {
          found = true;
          featurePath = path;
          feature = f;
          storyIndex = storyIdx;
          break;
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  if (!found) {
    console.error(chalk.red(`Error: Story ${id} not found`));
    process.exit(1);
  }

  let changed = false;
  const story = feature.userStories[storyIndex];
  const changes: Record<string, { oldValue: unknown; newValue: unknown }> = {};

  // Update status
  if (options.status) {
    if (!StoryStatus.options.includes(options.status)) {
      console.error(chalk.red(`Error: Invalid status "${options.status}" for Story`));
      console.error(chalk.yellow('Valid statuses:', StoryStatus.options.join(', ')));
      process.exit(1);
    }
    changes.status = { oldValue: story.status, newValue: options.status };
    story.status = options.status;
    changed = true;
    console.log(chalk.green(`✓ Updated ${id} status to ${options.status}`));
  }

  // Update actual hours (stories don't have actual hours in our model)
  if (options.actual !== undefined) {
    console.log(chalk.yellow(`Warning: Stories don't track actual hours (use Feature instead)`));
  }

  // Warn about unsupported options for stories
  if (options.assignee) {
    console.log(chalk.yellow(`Warning: Assignee cannot be set on Stories (use Features instead)`));
  }

  if (changed) {
    await writeFeatureFile(featurePath, feature);
    
    // Record changelog entries
    try {
      await getChangelogService().recordUpdates('story', id, changes);
    } catch {
      // Silently fail if changelog can't be written
    }
  } else {
    console.log(chalk.yellow('No changes specified. Use --status for stories'));
  }
}

export { updateCommand };