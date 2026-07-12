import { Command } from 'commander';
import path from 'path';
import { FRONTMATTER_SCHEMAS } from '../core/schema.js';
import {
  findById,
  formatZodError,
  writeEntity,
} from '../core/workspace.js';
import { fail, ok, printJson, requireWorkspace } from '../cli/output.js';

interface UpdateOptions {
  title?: string;
  status?: string;
  assignee?: string;
  owner?: string;
  priority?: string;
  estimate?: string;
  actual?: string;
  epic?: string;
  feature?: string;
  skills?: string;
  tags?: string;
  description?: string;
  json?: boolean;
}

function splitList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') return [];
  return value
    .split(/[,，;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const updateCommand = new Command('update')
  .description('更新实体的 frontmatter 字段（未提及的字段保持不变）')
  .argument('<id>', 'EPIC-xxx | FEAT-xxx | STORY-xxx')
  .option('--title <title>', '标题')
  .option('--status <status>', 'todo | in-progress | done | blocked')
  .option('--assignee <name>', '负责人（feature/story）')
  .option('--owner <name>', 'Owner（epic）')
  .option('--priority <priority>', 'low | medium | high | critical（feature）')
  .option('--estimate <hours>', '估算工时')
  .option('--actual <hours>', '实际工时')
  .option('--epic <id>', '改挂到另一个 Epic（feature）')
  .option('--feature <id>', '改挂到另一个 Feature（story）')
  .option('--skills <list>', '所需技能，逗号分隔；传空串清空（feature）')
  .option('--tags <list>', '标签，逗号分隔；传空串清空')
  .option('--description <text>', '替换 Markdown 正文')
  .option('--json', '以 JSON 输出更新后的实体')
  .action(async (idArg: string, options: UpdateOptions) => {
    const ws = await requireWorkspace();
    const found = findById(ws, idArg);
    if (!found) fail(`找不到实体 ${idArg.toUpperCase()}`);
    const { kind, loaded } = found;

    if (options.epic && !findById(ws, options.epic)) {
      fail(`找不到 Epic ${options.epic}`);
    }
    if (options.feature && !findById(ws, options.feature)) {
      fail(`找不到 Feature ${options.feature}`);
    }

    const changes: Record<string, unknown> = {
      title: options.title,
      status: options.status,
      assignee: options.assignee,
      owner: options.owner,
      priority: options.priority,
      estimate: options.estimate,
      actual: options.actual,
      epic: options.epic?.toUpperCase(),
      feature: options.feature?.toUpperCase(),
      skills: splitList(options.skills),
      tags: splitList(options.tags),
    };
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) delete changes[key];
    }
    const hasBodyChange = options.description !== undefined;
    if (Object.keys(changes).length === 0 && !hasBodyChange) {
      fail('没有提供任何要更新的字段（--status、--assignee 等）');
    }

    // 拒绝对该实体类型无意义的字段，避免"报告成功但什么都没改"
    const ALLOWED: Record<string, Set<string>> = {
      epic: new Set(['title', 'status', 'owner', 'estimate', 'actual', 'tags']),
      feature: new Set([
        'title', 'status', 'assignee', 'priority', 'estimate', 'actual',
        'epic', 'skills', 'tags',
      ]),
      story: new Set(['title', 'status', 'assignee', 'estimate', 'actual', 'feature']),
    };
    const inapplicable = Object.keys(changes).filter((key) => !ALLOWED[kind].has(key));
    if (inapplicable.length > 0) {
      fail(
        `${kind} 不支持字段: ${inapplicable.map((k) => `--${k}`).join(', ')}` +
          `（可用: ${[...ALLOWED[kind]].map((k) => `--${k}`).join(', ')}）`
      );
    }

    // 合并进原始 frontmatter（保留 schema 之外的自定义键），再整体校验
    const merged = { ...loaded.raw, ...changes };
    const parsed = FRONTMATTER_SCHEMAS[kind].safeParse(merged);
    if (!parsed.success) {
      fail(formatZodError(parsed.error));
    }

    const body = hasBodyChange ? (options.description ?? '').trim() : loaded.entity.body;
    // 写回实体实际所在文件（文件名与 ID 不一致时也不会产生同 ID 双文件）
    const file = await writeEntity(ws, kind, merged, body, {
      file: loaded.file,
      overwrite: true,
    });

    if (options.json) {
      printJson({ ...parsed.data, body, file: path.relative(ws.root, file) });
      return;
    }
    ok(`已更新 ${loaded.entity.id}`);
    for (const key of Object.keys(changes)) {
      console.log(`  ${key} → ${JSON.stringify(merged[key])}`);
    }
    if (hasBodyChange) console.log('  body 已替换');
  });
