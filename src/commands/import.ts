import { Command } from 'commander';
import path from 'path';
import { existsSync } from 'fs';
import {
  ImportFormat,
  ImportResult,
  runImport,
} from '../core/importers.js';
import { EntityKind, ID_PREFIX } from '../core/schema.js';
import { Workspace, nextId, writeEntity } from '../core/workspace.js';
import { fail, ok, printJson, warn, requireWorkspace } from '../cli/output.js';

/** 从工作区现有最大序号开始的连续 ID 分配器 */
function makeAllocator(ws: Workspace, kind: EntityKind, taken: Set<string>) {
  let counter = Number(nextId(ws, kind).split('-')[1]);
  return (preferred?: string): string => {
    if (preferred && !taken.has(preferred)) {
      taken.add(preferred);
      return preferred;
    }
    let id: string;
    do {
      id = `${ID_PREFIX[kind]}-${String(counter).padStart(3, '0')}`;
      counter++;
    } while (taken.has(id));
    taken.add(id);
    return id;
  };
}

interface PlannedEntity {
  kind: EntityKind;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** 将导入结果映射为待写入实体：分配最终 ID、解析 Epic/Feature 引用 */
export function planImport(
  ws: Workspace,
  result: ImportResult
): { planned: PlannedEntity[]; warnings: string[] } {
  const warnings = [...result.warnings];
  const existingIds = new Set(
    [...ws.epics, ...ws.features, ...ws.stories].map((item) => item.entity.id)
  );
  const allocEpic = makeAllocator(ws, 'epic', existingIds);
  const allocFeature = makeAllocator(ws, 'feature', existingIds);
  const allocStory = makeAllocator(ws, 'story', existingIds);
  const planned: PlannedEntity[] = [];

  // epicRef（v1 EPIC id 或分组名）→ 最终 epic id
  const epicIdByRef = new Map<string, string>();
  for (const epic of result.epics) {
    const preferred = epic.fm.id;
    const id = allocEpic(preferred);
    if (preferred && id !== preferred) {
      warnings.push(`${preferred} 已存在，改用新 ID ${id}`);
    }
    epicIdByRef.set(preferred ?? epic.fm.title, id);
    planned.push({ kind: 'epic', frontmatter: { ...epic.fm, id }, body: epic.body });
  }

  const featureIdByRef = new Map<string, string>();
  for (const feature of result.features) {
    const preferred = feature.fm.id;
    const id = allocFeature(preferred);
    if (preferred && id !== preferred) {
      warnings.push(`${preferred} 已存在，改用新 ID ${id}`);
    }
    if (preferred) featureIdByRef.set(preferred, id);
    const frontmatter: Record<string, unknown> = { ...feature.fm, id };
    if (feature.epicRef) {
      const epicId =
        epicIdByRef.get(feature.epicRef) ??
        (ws.epics.some((e) => e.entity.id === feature.epicRef)
          ? feature.epicRef
          : undefined);
      if (epicId) {
        frontmatter.epic = epicId;
      } else {
        warnings.push(`${id} 引用的 Epic "${feature.epicRef}" 未找到，已置空`);
      }
    }
    planned.push({ kind: 'feature', frontmatter, body: feature.body });
  }

  for (const story of result.stories) {
    const featureId =
      featureIdByRef.get(story.featureRef) ??
      (existingIds.has(story.featureRef) ? story.featureRef : undefined);
    if (!featureId) {
      warnings.push(`跳过 ${story.fm.title}: 父 Feature "${story.featureRef}" 未找到`);
      continue;
    }
    const preferred = story.fm.id;
    const id = allocStory(preferred);
    if (preferred && id !== preferred) {
      warnings.push(`${preferred} 已存在，改用新 ID ${id}`);
    }
    planned.push({
      kind: 'story',
      frontmatter: { ...story.fm, id, feature: featureId },
      body: story.body,
    });
  }

  return { planned, warnings };
}

export const importCommand = new Command('import')
  .description('从 v1 数据（features.csv / pmspace 富模型目录）或通用 CSV 导入')
  .argument('<target>', '文件或目录路径')
  .option('--format <format>', 'v1-csv | v1-pmspace | csv（默认自动探测）')
  .option('--dry-run', '只显示将要创建的内容，不写盘')
  .option('--json', '以 JSON 输出结果')
  .action(
    async (
      target: string,
      options: { format?: ImportFormat; dryRun?: boolean; json?: boolean }
    ) => {
      if (!existsSync(target)) fail(`路径不存在: ${target}`);
      if (
        options.format &&
        !['v1-csv', 'v1-pmspace', 'csv'].includes(options.format)
      ) {
        fail(`未知格式 "${options.format}"，可选: v1-csv | v1-pmspace | csv`);
      }
      const ws = await requireWorkspace();

      let result: ImportResult;
      try {
        result = await runImport(path.resolve(target), options.format);
      } catch (error) {
        return fail((error as Error).message);
      }
      const { planned, warnings } = planImport(ws, result);

      if (options.dryRun) {
        if (options.json) {
          printJson({
            format: result.format,
            dryRun: true,
            entities: planned.map((p) => ({
              kind: p.kind,
              id: p.frontmatter.id,
              title: p.frontmatter.title,
            })),
            warnings,
          });
          return;
        }
        console.log(`格式: ${result.format}（dry-run，未写盘）`);
        for (const item of planned) {
          console.log(`  + [${item.kind}] ${item.frontmatter.id}: ${item.frontmatter.title}`);
        }
        for (const message of warnings) warn(message);
        return;
      }

      const written: string[] = [];
      for (const item of planned) {
        const file = await writeEntity(ws, item.kind, item.frontmatter, item.body);
        written.push(path.relative(ws.root, file));
      }

      if (options.json) {
        printJson({ format: result.format, written, warnings });
        return;
      }
      ok(
        `已导入 ${planned.filter((p) => p.kind === 'epic').length} epics / ` +
          `${planned.filter((p) => p.kind === 'feature').length} features / ` +
          `${planned.filter((p) => p.kind === 'story').length} stories（格式: ${result.format}）`
      );
      for (const message of warnings) warn(message);
      console.log('\n建议运行 pmspec validate 复核导入结果');
    }
  );
