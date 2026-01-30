import { Command } from 'commander';
import chalk from 'chalk';
import { SearchService, highlightMatches, type SearchResult, type SearchOptions, type SearchableType } from '../core/search.js';

/**
 * Search command for CLI
 */
const searchCommand = new Command('search')
  .description('搜索项目中的 Epic、Feature、Story 和 Milestone')
  .argument('<query>', '搜索关键词')
  .option('--type <type>', '限制搜索类型: epic, feature, story, milestone')
  .option('--limit <number>', '返回结果数量限制', '20')
  .option('--no-highlight', '禁用高亮显示')
  .option('--json', '以 JSON 格式输出')
  .action(async (query: string, options) => {
    const startTime = Date.now();

    try {
      // Initialize search service
      const searchService = new SearchService(process.cwd());
      await searchService.index();

      // Build search options
      const searchOptions: SearchOptions = {
        limit: parseInt(options.limit, 10) || 20,
      };

      // Handle type filter
      if (options.type) {
        const validTypes: SearchableType[] = ['epic', 'feature', 'story', 'milestone'];
        const requestedType = options.type.toLowerCase() as SearchableType;

        if (!validTypes.includes(requestedType)) {
          console.error(chalk.red(`错误: 无效的类型 "${options.type}"`));
          console.error(chalk.gray(`有效类型: ${validTypes.join(', ')}`));
          process.exit(1);
        }

        searchOptions.type = requestedType;
      }

      // Perform search
      const results = searchService.search(query, searchOptions);
      const searchTime = Date.now() - startTime;

      // Output results
      if (options.json) {
        outputJson(results, searchTime);
      } else {
        outputFormatted(query, results, searchTime, options.highlight !== false);
      }

    } catch (error: any) {
      console.error(chalk.red('搜索错误:'), error.message);
      process.exit(1);
    }
  });

/**
 * Output results as JSON
 */
function outputJson(results: SearchResult[], searchTime: number): void {
  const output = {
    results,
    meta: {
      count: results.length,
      searchTime: `${searchTime}ms`,
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output formatted results for terminal
 */
function outputFormatted(
  query: string,
  results: SearchResult[],
  searchTime: number,
  useHighlight: boolean
): void {
  console.log(chalk.blue.bold(`\n🔍 搜索结果: "${query}"\n`));

  if (results.length === 0) {
    console.log(chalk.yellow('没有找到匹配的结果'));
    console.log(chalk.gray(`\n耗时: ${searchTime}ms`));
    return;
  }

  // Group results by type
  const grouped = groupByType(results);

  // Output each group
  for (const [type, typeResults] of Object.entries(grouped)) {
    const typeLabel = getTypeLabel(type as SearchableType);
    const typeColor = getTypeColor(type as SearchableType);

    console.log(typeColor(`\n═══ ${typeLabel} (${typeResults.length}) ═══\n`));

    for (const result of typeResults) {
      outputResult(result, useHighlight);
    }
  }

  // Summary
  console.log(chalk.gray(`\n────────────────────────────────────`));
  console.log(chalk.green(`找到 ${results.length} 个结果`));
  console.log(chalk.gray(`耗时: ${searchTime}ms`));
}

/**
 * Output a single search result
 */
function outputResult(result: SearchResult, useHighlight: boolean): void {
  const typeColor = getTypeColor(result.type);
  const typeEmoji = getTypeEmoji(result.type);

  // ID and Title
  const title = useHighlight
    ? highlightMatches(result.title, result.matches)
    : result.title;

  console.log(`${typeEmoji} ${typeColor(result.id)} ${chalk.white.bold(title)}`);

  // Description (truncated)
  if (result.description) {
    const desc = useHighlight
      ? highlightMatches(result.description, result.matches)
      : result.description;
    const truncatedDesc = truncate(desc, 100);
    console.log(chalk.gray(`   ${truncatedDesc}`));
  }

  // Parent reference
  if (result.parentId) {
    console.log(chalk.gray.dim(`   └─ 属于: ${result.parentId}`));
  }

  // Score (debug info)
  // console.log(chalk.gray.dim(`   分数: ${result.score.toFixed(2)}`));

  console.log('');
}

/**
 * Group results by type
 */
function groupByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const groups: Record<string, SearchResult[]> = {};

  for (const result of results) {
    if (!groups[result.type]) {
      groups[result.type] = [];
    }
    groups[result.type].push(result);
  }

  // Sort types in preferred order
  const order: SearchableType[] = ['epic', 'feature', 'story', 'milestone'];
  const ordered: Record<string, SearchResult[]> = {};

  for (const type of order) {
    if (groups[type]) {
      ordered[type] = groups[type];
    }
  }

  return ordered;
}

/**
 * Get display label for type
 */
function getTypeLabel(type: SearchableType): string {
  const labels: Record<SearchableType, string> = {
    epic: 'Epics',
    feature: 'Features',
    story: 'User Stories',
    milestone: 'Milestones',
  };
  return labels[type] || type;
}

/**
 * Get color for type
 */
function getTypeColor(type: SearchableType): (text: string) => string {
  const colors: Record<SearchableType, (text: string) => string> = {
    epic: chalk.magenta,
    feature: chalk.cyan,
    story: chalk.blue,
    milestone: chalk.green,
  };
  return colors[type] || chalk.white;
}

/**
 * Get emoji for type
 */
function getTypeEmoji(type: SearchableType): string {
  const emojis: Record<SearchableType, string> = {
    epic: '📦',
    feature: '✨',
    story: '📝',
    milestone: '🎯',
  };
  return emojis[type] || '•';
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export { searchCommand };
