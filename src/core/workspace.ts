import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ZodError } from 'zod';
import {
  Entity,
  EntityKind,
  Epic,
  Feature,
  FRONTMATTER_SCHEMAS,
  ID_PREFIX,
  Project,
  ProjectSchema,
  Story,
  Team,
  TeamSchema,
} from './schema.js';
import { parseEntityFile, serializeEntityFile } from './storage.js';

export const WORKSPACE_DIR = 'pmspace';

const KIND_DIRS: Record<EntityKind, string> = {
  epic: 'epics',
  feature: 'features',
  story: 'stories',
};

export interface LoadIssue {
  file: string;
  message: string;
}

/** 已加载实体：校验后的数据 + 原始 frontmatter（用于保真回写） + 文件路径 */
export interface Loaded<T extends Entity> {
  entity: T;
  raw: Record<string, unknown>;
  file: string;
}

export interface LoadedDoc<T> {
  data: T;
  raw: Record<string, unknown>;
  body: string;
  file: string;
}

export interface Workspace {
  /** 包含 pmspace/ 的目录 */
  root: string;
  /** pmspace/ 目录绝对路径 */
  dir: string;
  project: LoadedDoc<Project> | null;
  team: LoadedDoc<Team> | null;
  epics: Loaded<Epic>[];
  features: Loaded<Feature>[];
  stories: Loaded<Story>[];
  /** 加载阶段的文件级错误（解析失败、schema 不通过） */
  issues: LoadIssue[];
  /**
   * 已被占用的 ID：包括加载成功实体的 id，以及目录下所有 .md 文件名
   * 隐含的 ID（含解析失败的文件）。ID 分配与冲突检查必须以此为准，
   * 否则损坏文件占用的 ID 会被重新分配并导致覆盖。
   */
  reservedIds: Set<string>;
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const where = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${where}${issue.message}`;
    })
    .join('; ');
}

/** 从 startDir 向上查找包含 pmspace/ 的目录 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(current, WORKSPACE_DIR))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function loadEntities<T extends Entity>(
  ws: Workspace,
  kind: EntityKind
): Promise<Loaded<T>[]> {
  const dir = path.join(ws.dir, KIND_DIRS[kind]);
  if (!existsSync(dir)) return [];
  const result: Loaded<T>[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!(entry.isFile() || entry.isSymbolicLink()) || !entry.name.endsWith('.md')) {
      continue;
    }
    const file = path.join(dir, entry.name);
    // 文件名隐含的 ID 一律视为已占用（即使内容解析失败），防止 ID 重用导致覆盖
    const idFromName = path.basename(entry.name, '.md').toUpperCase();
    if (/^(EPIC|FEAT|STORY)-\d+/.test(idFromName)) {
      ws.reservedIds.add(idFromName.match(/^(?:EPIC|FEAT|STORY)-\d+/)![0]);
    }
    try {
      const content = await readFile(file, 'utf-8');
      const { data, body } = parseEntityFile(content);
      // frontmatter 里声明的 ID 同样占位（文件名与 ID 可能不一致）
      if (typeof data.id === 'string') ws.reservedIds.add(data.id.trim().toUpperCase());
      const parsed = FRONTMATTER_SCHEMAS[kind].safeParse(data);
      if (!parsed.success) {
        ws.issues.push({ file, message: formatZodError(parsed.error) });
        continue;
      }
      result.push({ entity: { ...parsed.data, body } as T, raw: data, file });
    } catch (error) {
      ws.issues.push({ file, message: (error as Error).message });
    }
  }
  result.sort((a, b) => a.entity.id.localeCompare(b.entity.id));
  return result;
}

async function loadDoc<T>(
  ws: Workspace,
  filename: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: ZodError } }
): Promise<LoadedDoc<T> | null> {
  const file = path.join(ws.dir, filename);
  if (!existsSync(file)) return null;
  try {
    const content = await readFile(file, 'utf-8');
    const { data, body } = parseEntityFile(content);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      ws.issues.push({ file, message: formatZodError(parsed.error!) });
      return null;
    }
    return { data: parsed.data!, raw: data, body, file };
  } catch (error) {
    ws.issues.push({ file, message: (error as Error).message });
    return null;
  }
}

/** 加载整个工作区。找不到 pmspace/ 时抛错。 */
export async function loadWorkspace(startDir: string = process.cwd()): Promise<Workspace> {
  const root = findWorkspaceRoot(startDir);
  if (!root) {
    throw new Error(
      `当前目录及其上级中未找到 ${WORKSPACE_DIR}/ 工作区，请先运行 pmspec init`
    );
  }
  const ws: Workspace = {
    root,
    dir: path.join(root, WORKSPACE_DIR),
    project: null,
    team: null,
    epics: [],
    features: [],
    stories: [],
    issues: [],
    reservedIds: new Set<string>(),
  };
  ws.project = await loadDoc<Project>(ws, 'project.md', ProjectSchema);
  ws.team = await loadDoc<Team>(ws, 'team.md', TeamSchema);
  ws.epics = await loadEntities<Epic>(ws, 'epic');
  ws.features = await loadEntities<Feature>(ws, 'feature');
  ws.stories = await loadEntities<Story>(ws, 'story');
  return ws;
}

export function allEntities(ws: Workspace): Array<{ kind: EntityKind; loaded: Loaded<Entity> }> {
  return [
    ...ws.epics.map((loaded) => ({ kind: 'epic' as EntityKind, loaded: loaded as Loaded<Entity> })),
    ...ws.features.map((loaded) => ({ kind: 'feature' as EntityKind, loaded: loaded as Loaded<Entity> })),
    ...ws.stories.map((loaded) => ({ kind: 'story' as EntityKind, loaded: loaded as Loaded<Entity> })),
  ];
}

export function findById(
  ws: Workspace,
  id: string
): { kind: EntityKind; loaded: Loaded<Entity> } | null {
  const target = id.trim().toUpperCase();
  for (const item of allEntities(ws)) {
    if (item.loaded.entity.id === target) return item;
  }
  return null;
}

export function featuresOfEpic(ws: Workspace, epicId: string): Loaded<Feature>[] {
  return ws.features.filter((f) => f.entity.epic === epicId);
}

export function storiesOfFeature(ws: Workspace, featureId: string): Loaded<Story>[] {
  return ws.stories.filter((s) => s.entity.feature === featureId);
}

/**
 * 分配下一个可用 ID：基于 reservedIds（含解析失败文件占用的 ID）
 * 取最大序号 + 1，至少 3 位补零。绝不返回已被任何文件占用的 ID。
 */
export function nextId(ws: Workspace, kind: EntityKind): string {
  const prefix = ID_PREFIX[kind];
  let max = 0;
  for (const id of ws.reservedIds) {
    if (!id.startsWith(`${prefix}-`)) continue;
    const num = Number(id.slice(prefix.length + 1));
    if (Number.isFinite(num) && num > max) max = num;
  }
  const id = `${prefix}-${String(max + 1).padStart(3, '0')}`;
  ws.reservedIds.add(id);
  return id;
}

export function entityFilePath(ws: Workspace, kind: EntityKind, id: string): string {
  return path.join(ws.dir, KIND_DIRS[kind], `${id}.md`);
}

export interface WriteEntityOptions {
  /**
   * 显式写回路径（更新场景传 loaded.file，保证写回实体实际所在文件，
   * 即使文件名与 ID 不一致也不会产生同 ID 双文件）。
   */
  file?: string;
  /** 允许覆盖已存在文件。更新场景为 true；创建场景省略（默认拒绝覆盖）。 */
  overwrite?: boolean;
}

/**
 * 写入实体文件。frontmatter 传入完整的原始键值对象
 * （更新场景 = 原始 raw 与变更合并后的结果，保留自定义字段）。
 *
 * 创建场景（未指定 overwrite）遇到已存在的目标文件会抛错而不是覆盖——
 * 已存在的文件可能是解析失败被跳过的实体，静默覆盖等于销毁用户数据。
 */
export async function writeEntity(
  ws: Workspace,
  kind: EntityKind,
  frontmatter: Record<string, unknown>,
  body: string,
  options: WriteEntityOptions = {}
): Promise<string> {
  const id = String(frontmatter.id ?? '');
  if (!id) throw new Error('frontmatter 缺少 id，无法写入实体文件');
  const file = options.file ?? entityFilePath(ws, kind, id);
  if (!options.overwrite && existsSync(file)) {
    throw new Error(
      `${path.relative(ws.root, file)} 已存在，拒绝覆盖。` +
        `若该文件是解析失败的实体，请先运行 pmspec validate 查看并修复`
    );
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, serializeEntityFile(frontmatter, body), 'utf-8');
  ws.reservedIds.add(id.toUpperCase());
  return file;
}

export interface InitOptions {
  name?: string;
  minimal?: boolean;
  force?: boolean;
}

const PROJECT_TEMPLATE = (name: string) => `---
name: ${name}
---

# 项目概览

在这里描述项目目标、范围、里程碑与约束。

结构化字段（项目名称等）放在上方 frontmatter；本正文为自由 Markdown。
`;

const TEAM_TEMPLATE = `---
members: []
# 示例：
# members:
#   - name: alice
#     skills: [typescript, react]
#     capacity: 40   # 每周可用小时
---

# 团队

在上方 frontmatter 的 members 中维护成员、技能与每周容量（小时）。
`;

/** 初始化 pmspace/ 工作区，返回创建的路径列表 */
export async function createWorkspace(
  baseDir: string,
  options: InitOptions = {}
): Promise<string[]> {
  const dir = path.join(baseDir, WORKSPACE_DIR);
  if (existsSync(dir) && !options.force) {
    throw new Error(`${dir} 已存在。如需重新初始化请使用 --force`);
  }
  const created: string[] = [];
  const projectName = options.name?.trim() || path.basename(path.resolve(baseDir));

  await mkdir(dir, { recursive: true });

  const projectFile = path.join(dir, 'project.md');
  await writeFile(projectFile, PROJECT_TEMPLATE(projectName), 'utf-8');
  created.push(projectFile);

  const dirs = options.minimal ? ['features'] : ['epics', 'features', 'stories'];
  for (const sub of dirs) {
    const subDir = path.join(dir, sub);
    await mkdir(subDir, { recursive: true });
    const keep = path.join(subDir, '.gitkeep');
    await writeFile(keep, '', 'utf-8');
    created.push(subDir);
  }

  if (!options.minimal) {
    const teamFile = path.join(dir, 'team.md');
    await writeFile(teamFile, TEAM_TEMPLATE, 'utf-8');
    created.push(teamFile);
  }

  return created;
}
