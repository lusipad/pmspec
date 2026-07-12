import { Command } from 'commander';
import path from 'path';
import { existsSync } from 'fs';
import {
  ImportFormat,
  ImportResult,
  runImport,
} from '../core/importers.js';
import { EntityKind, ID_PREFIX, FRONTMATTER_SCHEMAS } from '../core/schema.js';
import { Workspace, formatZodError, writeEntity } from '../core/workspace.js';
import { fail, ok, printJson, warn, requireWorkspace } from '../cli/output.js';

/**
 * 连续 ID 分配器。taken 必须以 ws.reservedIds 为底（含解析失败文件
 * 占用的 ID），否则会分配出已被磁盘文件占用的 ID 导致覆盖。
 */
function makeAllocator(kind: EntityKind, taken: Set<string>) {
  const prefix = `${ID_PREFIX[kind]}-`;
  let counter = 1;
  for (const id of taken) {
    if (!id.startsWith(prefix)) continue;
    const num = Number(id.slice(prefix.length));
    if (Number.isFinite(num) && num >= counter) counter = num + 1;
  }
  return (preferred?: string): string => {
    if (preferred && !taken.has(preferred)) {
      taken.add(preferred);
      return preferred;
    }
    let id: string;
    do {
      id = `${prefix}${String(counter).padStart(3, '0')}`;
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
  // 以 reservedIds 为底：含解析失败文件占用的 ID，防止分配后覆盖
  const existingIds = new Set(ws.reservedIds);
  const allocEpic = makeAllocator('epic', existingIds);
  const allocFeature = makeAllocator('feature', existingIds);
  const allocStory = makeAllocator('story', existingIds);
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

  const wsFeatureIds = new Set(ws.features.map((f) => f.entity.id));
  for (const story of result.stories) {
    const featureId =
      featureIdByRef.get(story.featureRef) ??
      (wsFeatureIds.has(story.featureRef) ? story.featureRef : undefined);
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

  // 落盘前逐个 schema 校验：不产出 pmspec 自己都拒绝加载的文件
  const valid: PlannedEntity[] = [];
  for (const item of planned) {
    const parsed = FRONTMATTER_SCHEMAS[item.kind].safeParse(item.frontmatter);
    if (!parsed.success) {
      warnings.push(
        `跳过 ${String(item.frontmatter.id)}（${String(item.frontmatter.title)}）: ` +
          formatZodError(parsed.error)
      );
      continue;
    }
    valid.push(item);
  }

  return { planned: valid, warnings };
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

      // 原地导入防护：导入目标在当前工作区内（或包含工作区）时，
      // 写入会覆盖源数据，违反"导入只做新增写入"的承诺
      const resolvedTarget = path.resolve(target);
      const wsDir = path.resolve(ws.dir);
      const within = (child: string, parent: string) =>
        child === parent || child.startsWith(parent + path.sep);
      if (within(resolvedTarget, wsDir) || within(wsDir, resolvedTarget)) {
        fail(
          `导入目标 ${target} 与当前工作区 ${path.relative(process.cwd(), wsDir) || wsDir} 重叠，` +
            '原地导入会覆盖源数据。请把旧数据放到工作区之外（如 ../old-pmspace）再导入'
        );
      }

      let result: ImportResult;
      try {
        result = await runImport(resolvedTarget, options.format);
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
        try {
          const file = await writeEntity(ws, item.kind, item.frontmatter, item.body);
          written.push(path.relative(ws.root, file));
        } catch (error) {
          warnings.push(`跳过 ${String(item.frontmatter.id)}: ${(error as Error).message}`);
        }
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
