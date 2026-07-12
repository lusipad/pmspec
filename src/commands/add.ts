import { Command } from 'commander';
import path from 'path';
import {
  EntityKind,
  FRONTMATTER_SCHEMAS,
} from '../core/schema.js';
import {
  findById,
  nextId,
  writeEntity,
} from '../core/workspace.js';
import { formatZodError } from '../core/workspace.js';
import { fail, ok, printJson, requireWorkspace } from '../cli/output.js';

interface AddOptions {
  title?: string;
  epic?: string;
  feature?: string;
  status?: string;
  assignee?: string;
  priority?: string;
  estimate?: string;
  skills?: string;
  tags?: string;
  description?: string;
  json?: boolean;
}

const KINDS: EntityKind[] = ['epic', 'feature', 'story'];

function splitList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(/[,，;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const addCommand = new Command('add')
  .description('创建 Epic / Feature / Story')
  .argument('<kind>', `实体类型: ${KINDS.join(' | ')}`)
  .requiredOption('--title <title>', '标题（必填）')
  .option('--epic <id>', '所属 Epic（feature 可选）')
  .option('--feature <id>', '所属 Feature（story 必填）')
  .option('--status <status>', 'todo | in-progress | done | blocked')
  .option('--assignee <name>', '负责人')
  .option('--priority <priority>', 'low | medium | high | critical（仅 feature）')
  .option('--estimate <hours>', '估算工时，如 16 或 16h')
  .option('--skills <list>', '所需技能，逗号分隔（仅 feature）')
  .option('--tags <list>', '标签，逗号分隔')
  .option('--description <text>', 'Markdown 正文描述')
  .option('--json', '以 JSON 输出创建的实体')
  .action(async (kindArg: string, options: AddOptions) => {
    const kind = kindArg.toLowerCase() as EntityKind;
    if (!KINDS.includes(kind)) {
      fail(`未知实体类型 "${kindArg}"，可选: ${KINDS.join(' | ')}`);
    }

    const ws = await requireWorkspace();

    // 引用提前校验，给出比 schema 错误更可操作的信息
    if (kind === 'story') {
      if (!options.feature) fail('创建 story 需要 --feature <FEAT-xxx>');
      if (!findById(ws, options.feature)) {
        fail(`找不到 Feature ${options.feature}（先用 pmspec list features 查看现有 ID）`);
      }
    }
    if (kind === 'feature' && options.epic && !findById(ws, options.epic)) {
      fail(`找不到 Epic ${options.epic}（先用 pmspec list epics 查看现有 ID）`);
    }
    if (kind === 'epic' && (options.epic || options.feature)) {
      fail('epic 不支持 --epic/--feature 选项');
    }

    const id = nextId(ws, kind);
    const frontmatter: Record<string, unknown> = {
      id,
      title: options.title,
      status: options.status,
      assignee: options.assignee,
      estimate: options.estimate,
      tags: splitList(options.tags),
    };
    if (kind === 'feature') {
      frontmatter.epic = options.epic?.toUpperCase();
      frontmatter.priority = options.priority;
      frontmatter.skills = splitList(options.skills);
    }
    if (kind === 'story') {
      frontmatter.feature = options.feature?.toUpperCase();
    }
    if (kind === 'epic') {
      frontmatter.owner = options.assignee;
      delete frontmatter.assignee;
    }
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value === undefined) delete frontmatter[key];
    }

    const parsed = FRONTMATTER_SCHEMAS[kind].safeParse(frontmatter);
    if (!parsed.success) {
      fail(formatZodError(parsed.error));
    }

    const body = options.description?.trim() ?? '';
    const file = await writeEntity(ws, kind, { ...parsed.data }, body);

    if (options.json) {
      printJson({ ...parsed.data, body, file: path.relative(ws.root, file) });
      return;
    }
    ok(`已创建 ${id}: ${options.title}`);
    console.log(`  ${path.relative(process.cwd(), file)}`);
  });
