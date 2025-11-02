import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { EpicSchema, FeatureSchema, UserStorySchema, generateNextId } from '../core/project.js';
import { writeEpicFile, writeFeatureFile } from '../utils/markdown.js';
import { readEpicFile, readFeatureFile } from '../core/parser.js';

const createCommand = new Command('create')
  .description('Create new Epic, Feature, or User Story')
  .argument('<type>', 'Type of item to create (epic, feature, story)')
  .option('-e, --epic <id>', 'Epic ID for Feature (required for feature)')
  .option('-f, --feature <id>', 'Feature ID for Story (required for story)')
  .option('--non-interactive', 'Skip prompts and use defaults')
  .action(async (type, options, command) => {
    try {
      type = type.toLowerCase();

      if (!['epic', 'feature', 'story'].includes(type)) {
        console.error(chalk.red('Error: Type must be epic, feature, or story'));
        process.exit(1);
      }

      // Check if pmspec directory exists
      try {
        await readdir('pmspace');
      } catch {
        console.error(chalk.red('Error: pmspec directory not found. Run "pmspec init" first.'));
        process.exit(1);
      }

      if (type === 'epic') {
        await createEpic(options.nonInteractive);
      } else if (type === 'feature') {
        await createFeature(options.epic, options.nonInteractive);
      } else if (type === 'story') {
        await createStory(options.feature, options.nonInteractive);
      }

    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function createEpic(nonInteractive: boolean) {
  // Get existing epics to determine next ID
  let existingEpics: string[] = [];
  try {
    const epicFiles = await readdir('pmspace/epics');
    for (const file of epicFiles) {
      if (file.endsWith('.md')) {
        const content = await readEpicFile(join('pmspace/epics', file));
        existingEpics.push(content.id);
      }
    }
  } catch {
    // Directory might not exist or be empty
  }

  const epicId = generateNextId('EPIC', existingEpics);

  if (nonInteractive) {
    const epic = EpicSchema.parse({
      id: epicId,
      title: 'New Epic',
      status: 'planning',
      estimate: 40,
      description: 'Epic description',
      features: []
    });

    await writeEpicFile(`pmspace/epics/${epicId.toLowerCase()}.md`, epic);
    console.log(chalk.green(`✓ Created Epic ${epicId}`));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input' as const,
      name: 'title' as const,
      message: 'Epic title:' as const,
      validate: (input: string) => input.trim() !== '' || 'Title is required'
    },
    {
      type: 'list' as const,
      name: 'status' as const,
      message: 'Status:' as const,
      choices: ['planning', 'in-progress', 'completed'],
      default: 'planning'
    },
    {
      type: 'input' as const,
      name: 'owner' as const,
      message: 'Owner (optional):' as const
    },
    {
      type: 'number' as const,
      name: 'estimate' as const,
      message: 'Estimate (hours):' as const,
      validate: (input: number) => input > 0 || 'Estimate must be positive',
      default: 40
    },
    {
      type: 'input' as const,
      name: 'description' as const,
      message: 'Description (optional):' as const
    }
  ]) as any;

  const epic = EpicSchema.parse({
    id: epicId,
    title: answers.title.trim(),
    status: answers.status,
    owner: answers.owner?.trim() || undefined,
    estimate: answers.estimate,
    description: answers.description?.trim() || undefined,
    features: []
  });

  await writeEpicFile(`pmspace/epics/${epicId.toLowerCase()}.md`, epic);
  console.log(chalk.green(`✓ Created Epic ${epicId}: ${epic.title}`));
}

async function createFeature(epicId: string | undefined, nonInteractive: boolean) {
  if (!epicId) {
    if (nonInteractive) {
      console.error(chalk.red('Error: Epic ID is required for feature creation'));
      process.exit(1);
    }

    // Get existing epics for selection
    const epics: Array<{id: string, title: string}> = [];
    try {
      const epicFiles = await readdir('pmspace/epics');
      for (const file of epicFiles) {
        if (file.endsWith('.md')) {
          const content = await readEpicFile(join('pmspace/epics', file));
          epics.push({ id: content.id, title: content.title });
        }
      }
    } catch {
      console.error(chalk.red('Error: No epics found. Create an epic first.'));
      process.exit(1);
    }

    if (epics.length === 0) {
      console.error(chalk.red('Error: No epics found. Create an epic first.'));
      process.exit(1);
    }

    const answer = await inquirer.prompt([
      {
        type: 'list' as const,
        name: 'epicId' as const,
        message: 'Select Epic:' as const,
        choices: epics.map(e => ({ name: `${e.id}: ${e.title}`, value: e.id }))
      }
    ]) as any;
    epicId = answer.epicId;
  }

  // Validate epic exists
  try {
    await readEpicFile(`pmspace/epics/${epicId.toLowerCase()}.md`);
  } catch {
    console.error(chalk.red(`Error: Epic ${epicId} not found`));
    process.exit(1);
  }

  // Get existing features to determine next ID
  let existingFeatures: string[] = [];
  try {
    const featureFiles = await readdir('pmspace/features');
    for (const file of featureFiles) {
      if (file.endsWith('.md')) {
        const content = await readFeatureFile(join('pmspace/features', file));
        existingFeatures.push(content.id);
      }
    }
  } catch {
    // Directory might not exist or be empty
  }

  const featureId = generateNextId('FEAT', existingFeatures);

  if (nonInteractive) {
    const feature = FeatureSchema.parse({
      id: featureId,
      title: 'New Feature',
      epicId: epicId!,
      status: 'todo',
      estimate: 16,
      skillsRequired: [],
      description: 'Feature description',
      userStories: [],
      acceptanceCriteria: []
    });

    await writeFeatureFile(`pmspace/features/${featureId.toLowerCase()}.md`, feature);
    console.log(chalk.green(`✓ Created Feature ${featureId} under Epic ${epicId}`));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input' as const,
      name: 'title' as const,
      message: 'Feature title:' as const,
      validate: (input: string) => input.trim() !== '' || 'Title is required'
    },
    {
      type: 'list' as const,
      name: 'status' as const,
      message: 'Status:' as const,
      choices: ['todo', 'in-progress', 'done'],
      default: 'todo'
    },
    {
      type: 'input' as const,
      name: 'assignee' as const,
      message: 'Assignee (optional):' as const
    },
    {
      type: 'number' as const,
      name: 'estimate' as const,
      message: 'Estimate (hours):' as const,
      validate: (input: number) => input > 0 || 'Estimate must be positive',
      default: 16
    },
    {
      type: 'input' as const,
      name: 'skillsRequired' as const,
      message: 'Skills required (comma-separated, optional):' as const,
      filter: (input: string) => input.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
    },
    {
      type: 'input' as const,
      name: 'description' as const,
      message: 'Description (optional):' as const
    },
    {
      type: 'input' as const,
      name: 'acceptanceCriteria' as const,
      message: 'Acceptance criteria (one per line, optional):' as const,
      filter: (input: string) => input.split('\n').map((s: string) => s.trim()).filter((s: string) => s !== '')
    }
  ]) as any;

  const feature = FeatureSchema.parse({
    id: featureId,
    title: answers.title.trim(),
    epicId: epicId!,
    status: answers.status,
    assignee: answers.assignee?.trim() || undefined,
    estimate: answers.estimate,
    skillsRequired: answers.skillsRequired,
    description: answers.description?.trim() || undefined,
    userStories: [],
    acceptanceCriteria: answers.acceptanceCriteria
  });

  await writeFeatureFile(`pmspace/features/${featureId.toLowerCase()}.md`, feature);

  // Update epic to include this feature
  const epicPath = `pmspace/epics/${epicId.toLowerCase()}.md`;
  const epic = await readEpicFile(epicPath);
  if (!epic.features.includes(featureId)) {
    epic.features.push(featureId);
    await writeEpicFile(epicPath, epic);
  }

  console.log(chalk.green(`✓ Created Feature ${featureId}: ${feature.title} under Epic ${epicId}`));
}

async function createStory(featureId: string | undefined, nonInteractive: boolean) {
  if (!featureId) {
    if (nonInteractive) {
      console.error(chalk.red('Error: Feature ID is required for story creation'));
      process.exit(1);
    }

    // Get existing features for selection
    const features: Array<{id: string, title: string}> = [];
    try {
      const featureFiles = await readdir('pmspace/features');
      for (const file of featureFiles) {
        if (file.endsWith('.md')) {
          const content = await readFeatureFile(join('pmspace/features', file));
          features.push({ id: content.id, title: content.title });
        }
      }
    } catch {
      console.error(chalk.red('Error: No features found. Create a feature first.'));
      process.exit(1);
    }

    if (features.length === 0) {
      console.error(chalk.red('Error: No features found. Create a feature first.'));
      process.exit(1);
    }

    const answer = await inquirer.prompt([
      {
        type: 'list' as const,
        name: 'featureId' as const,
        message: 'Select Feature:' as const,
        choices: features.map(f => ({ name: `${f.id}: ${f.title}`, value: f.id }))
      }
    ]) as any;
    featureId = answer.featureId;
  }

  // Validate feature exists
  try {
    await readFeatureFile(`pmspace/features/${featureId.toLowerCase()}.md`);
  } catch {
    console.error(chalk.red(`Error: Feature ${featureId} not found`));
    process.exit(1);
  }

  // Get existing stories to determine next ID
  let existingStories: string[] = [];
  try {
    const featureFiles = await readdir('pmspace/features');
    for (const file of featureFiles) {
      if (file.endsWith('.md')) {
        const content = await readFeatureFile(join('pmspace/features', file));
        existingStories.push(...content.userStories.map((s: any) => s.id));
      }
    }
  } catch {
    // Directory might not exist or be empty
  }

  const storyId = generateNextId('STORY', existingStories);

  if (nonInteractive) {
    const story = UserStorySchema.parse({
      id: storyId,
      title: 'New User Story',
      estimate: 4,
      status: 'todo',
      featureId: featureId!,
      description: 'User story description'
    });

    // Update feature to include this story
    const featurePath = `pmspace/features/${featureId.toLowerCase()}.md`;
    const feature = await readFeatureFile(featurePath);
    feature.userStories.push(story);
    await writeFeatureFile(featurePath, feature);

    console.log(chalk.green(`✓ Created User Story ${storyId} under Feature ${featureId}`));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input' as const,
      name: 'title' as const,
      message: 'User Story title:' as const,
      validate: (input: string) => input.trim() !== '' || 'Title is required'
    },
    {
      type: 'number' as const,
      name: 'estimate' as const,
      message: 'Estimate (hours):' as const,
      validate: (input: number) => input > 0 || 'Estimate must be positive',
      default: 4
    },
    {
      type: 'list' as const,
      name: 'status' as const,
      message: 'Status:' as const,
      choices: ['todo', 'in-progress', 'done'],
      default: 'todo'
    },
    {
      type: 'input' as const,
      name: 'description' as const,
      message: 'Description (optional):' as const
    }
  ]) as any;

  const story = UserStorySchema.parse({
    id: storyId,
    title: answers.title.trim(),
    estimate: answers.estimate,
    status: answers.status,
    featureId: featureId!,
    description: answers.description?.trim() || undefined
  });

  // Update feature to include this story
  const featurePath = `pmspace/features/${featureId.toLowerCase()}.md`;
  const feature = await readFeatureFile(featurePath);
  feature.userStories.push(story);
  await writeFeatureFile(featurePath, feature);

  console.log(chalk.green(`✓ Created User Story ${storyId}: ${story.title} under Feature ${featureId}`));
}

export { createCommand };