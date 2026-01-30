import { Command } from 'commander';
import chalk from 'chalk';
import { ChangelogService } from '../core/changelog-service.js';
import { ChangelogEntry, formatChangelogEntry } from '../core/changelog.js';

const historyCommand = new Command('history')
  .description('Show change history for entities')
  .argument('[entityId]', 'Entity ID to show history for (e.g., FEAT-001, EPIC-001)')
  .option('-a, --all', 'Show all change history')
  .option('--since <date>', 'Show changes since date (YYYY-MM-DD)')
  .option('--until <date>', 'Show changes until date (YYYY-MM-DD)')
  .option('-t, --type <type>', 'Filter by entity type (epic, feature, milestone, story)')
  .option('--action <action>', 'Filter by action (create, update, delete)')
  .option('-n, --limit <number>', 'Limit number of entries', '50')
  .option('--json', 'Output as JSON')
  .option('--diff', 'Show detailed diff view for updates')
  .option('--stats', 'Show changelog statistics')
  .action(async (entityId, options) => {
    try {
      const service = new ChangelogService();

      // Show stats if requested
      if (options.stats) {
        await showStats(service);
        return;
      }

      // Validate options
      if (!entityId && !options.all && !options.since && !options.type) {
        console.error(chalk.red('Error: Please specify an entity ID, use --all, or provide filter options'));
        console.log(chalk.yellow('Usage examples:'));
        console.log(chalk.gray('  pmspec history FEAT-001       # Show history for FEAT-001'));
        console.log(chalk.gray('  pmspec history --all          # Show all changes'));
        console.log(chalk.gray('  pmspec history --since 2024-01-01'));
        console.log(chalk.gray('  pmspec history --type feature'));
        console.log(chalk.gray('  pmspec history --stats        # Show statistics'));
        process.exit(1);
      }

      // Build query options
      const queryOptions: any = {
        limit: parseInt(options.limit) || 50,
      };

      if (entityId) {
        queryOptions.entityId = entityId.toUpperCase();
      }

      if (options.since) {
        queryOptions.since = new Date(options.since).toISOString();
      }

      if (options.until) {
        queryOptions.until = new Date(options.until).toISOString();
      }

      if (options.type) {
        queryOptions.entityType = options.type.toLowerCase();
      }

      if (options.action) {
        queryOptions.action = options.action.toLowerCase();
      }

      const entries = await service.query(queryOptions);

      if (entries.length === 0) {
        console.log(chalk.yellow('No change history found matching the criteria'));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      // Display header
      if (entityId) {
        console.log(chalk.blue.bold(`\n📜 Change History for ${entityId.toUpperCase()}\n`));
      } else {
        console.log(chalk.blue.bold(`\n📜 Change History (${entries.length} entries)\n`));
      }

      // Display entries
      if (options.diff) {
        displayDiffView(entries);
      } else {
        displayTimelineView(entries);
      }

    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function displayTimelineView(entries: ChangelogEntry[]) {
  // Group entries by date
  const grouped = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(entry);
  }

  for (const [date, dateEntries] of grouped) {
    console.log(chalk.yellow(`\n${formatDate(date)}`));
    console.log(chalk.gray('─'.repeat(40)));

    for (const entry of dateEntries) {
      const time = formatTime(entry.timestamp);
      const icon = getActionIcon(entry.action);
      const color = getActionColor(entry.action);

      console.log(`${chalk.gray(time)} ${icon} ${color(formatEntryDescription(entry))}`);

      if (entry.action === 'update' && entry.field) {
        const oldVal = formatDisplayValue(entry.oldValue);
        const newVal = formatDisplayValue(entry.newValue);
        console.log(chalk.gray(`         ${entry.field}: ${oldVal} → ${newVal}`));
      }
    }
  }

  console.log('');
}

function displayDiffView(entries: ChangelogEntry[]) {
  for (const entry of entries) {
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.bold(entry.id)} - ${formatDateTime(entry.timestamp)}`);
    console.log(`${getActionIcon(entry.action)} ${getActionColor(entry.action)(entry.action.toUpperCase())} ${entry.entityType} ${chalk.cyan(entry.entityId)}`);

    if (entry.user) {
      console.log(chalk.gray(`   by ${entry.user}`));
    }

    if (entry.action === 'update' && entry.field) {
      console.log('');
      console.log(chalk.yellow(`   Field: ${entry.field}`));
      console.log(chalk.red(`   - ${formatDisplayValue(entry.oldValue)}`));
      console.log(chalk.green(`   + ${formatDisplayValue(entry.newValue)}`));
    }

    console.log('');
  }
}

async function showStats(service: ChangelogService) {
  const stats = await service.getStats();

  console.log(chalk.blue.bold('\n📊 Changelog Statistics\n'));

  console.log(`Total entries: ${chalk.cyan(stats.totalEntries)}`);

  console.log(chalk.yellow('\nBy Entity Type:'));
  for (const [type, count] of Object.entries(stats.byEntityType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log(chalk.yellow('\nBy Action:'));
  for (const [action, count] of Object.entries(stats.byAction)) {
    const icon = getActionIcon(action as any);
    console.log(`  ${icon} ${action}: ${count}`);
  }

  console.log(chalk.yellow('\nRecent Activity:'));
  console.log(`  Last 24 hours: ${stats.recentActivity.last24h}`);
  console.log(`  Last 7 days: ${stats.recentActivity.last7d}`);
  console.log(`  Last 30 days: ${stats.recentActivity.last30d}`);

  console.log('');
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'create':
      return '✨';
    case 'update':
      return '📝';
    case 'delete':
      return '🗑️';
    default:
      return '•';
  }
}

function getActionColor(action: string): (text: string) => string {
  switch (action) {
    case 'create':
      return (text: string) => chalk.green(text);
    case 'update':
      return (text: string) => chalk.blue(text);
    case 'delete':
      return (text: string) => chalk.red(text);
    default:
      return (text: string) => text;
  }
}

function formatEntryDescription(entry: ChangelogEntry): string {
  const entityInfo = `${entry.entityType} ${chalk.cyan(entry.entityId)}`;

  switch (entry.action) {
    case 'create':
      return `Created ${entityInfo}`;
    case 'delete':
      return `Deleted ${entityInfo}`;
    case 'update':
      return `Updated ${entityInfo}${entry.field ? ` (${entry.field})` : ''}`;
    default:
      return `${entry.action} ${entityInfo}`;
  }
}

function formatDisplayValue(value: unknown): string {
  if (value === undefined || value === null) {
    return chalk.gray('(empty)');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export { historyCommand };
