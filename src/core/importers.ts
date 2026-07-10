import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  EpicFrontmatter,
  FeatureFrontmatter,
  Priority,
  Status,
  StoryFrontmatter,
} from './schema.js';

/**
 * v1 数据迁移与通用 CSV 导入（对应 spec：project-data / v1 数据迁移）。
 * 导入只产出内存结果，由调用方（import 命令）负责分配最终 ID 并写盘；
 * 不修改、不删除任何源数据。
 */

export interface ImportedEpic {
  fm: Omit<EpicFrontmatter, 'id'> & { id?: string };
  body: string;
}
export interface ImportedFeature {
  fm: Omit<FeatureFrontmatter, 'id' | 'epic'> & { id?: string };
  body: string;
  /** 源数据中的 Epic 引用：v1 的 EPIC-xxx 或分组名 */
  epicRef?: string;
}
export interface ImportedStory {
  fm: Omit<StoryFrontmatter, 'id' | 'feature'> & { id?: string };
  body: string;
  /** 源数据中的父 Feature 引用（v1 FEAT-xxx） */
  featureRef: string;
}

export interface ImportResult {
  format: ImportFormat;
  epics: ImportedEpic[];
  features: ImportedFeature[];
  stories: ImportedStory[];
  warnings: string[];
}

export type ImportFormat = 'v1-csv' | 'v1-pmspace' | 'csv';

/* ---------- 通用工具 ---------- */

/** 极简但正确的 CSV 解析：支持引号包裹、转义引号、CRLF */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = content.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row.map((f) => f.trim()));
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row.map((f) => f.trim()));
  return rows;
}

const STATUS_ALIASES: Record<string, Status> = {
  todo: 'todo',
  待办: 'todo',
  planning: 'todo',
  计划中: 'todo',
  'in-progress': 'in-progress',
  'in progress': 'in-progress',
  进行中: 'in-progress',
  doing: 'in-progress',
  done: 'done',
  完成: 'done',
  已完成: 'done',
  completed: 'done',
  blocked: 'blocked',
  阻塞: 'blocked',
  被阻塞: 'blocked',
};

export function mapStatus(value: string | undefined): Status {
  if (!value) return 'todo';
  return STATUS_ALIASES[value.trim().toLowerCase()] ?? 'todo';
}

const PRIORITY_ALIASES: Record<string, Priority> = {
  low: 'low',
  低: 'low',
  medium: 'medium',
  中: 'medium',
  普通: 'medium',
  high: 'high',
  高: 'high',
  critical: 'critical',
  紧急: 'critical',
  最高: 'critical',
};

export function mapPriority(value: string | undefined): Priority {
  if (!value) return 'medium';
  return PRIORITY_ALIASES[value.trim().toLowerCase()] ?? 'medium';
}

export function parseHours(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:h|hours?|小时)?$/i);
  if (!match) return undefined;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

/* ---------- 格式探测 ---------- */

export async function detectFormat(target: string): Promise<ImportFormat> {
  const info = await stat(target);
  if (info.isDirectory()) return 'v1-pmspace';
  const content = await readFile(target, 'utf-8');
  const firstLine = content.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.startsWith('ID,功能名称')) return 'v1-csv';
  return 'csv';
}

/* ---------- v1 简单模型 CSV ---------- */

// v1 列: ID,功能名称,描述,预估工作量(h),分配给,优先级,状态,分组,标签,创建日期,截止日期
export function importV1Csv(content: string): ImportResult {
  const rows = parseCsv(content);
  const result: ImportResult = {
    format: 'v1-csv',
    epics: [],
    features: [],
    stories: [],
    warnings: [],
  };
  if (rows.length < 2) {
    result.warnings.push('CSV 中没有数据行');
    return result;
  }
  const categories = new Map<string, ImportedEpic>();
  for (const row of rows.slice(1)) {
    const [id, name, description, estimate, assignee, priority, status, category, tags] = row;
    if (!name) {
      result.warnings.push(`跳过缺少功能名称的行: ${row.join(',')}`);
      continue;
    }
    const epicRef = category?.trim() || undefined;
    if (epicRef && !categories.has(epicRef)) {
      categories.set(epicRef, {
        fm: { title: epicRef, status: 'todo', tags: [] },
        body: `由 v1 分组 "${epicRef}" 迁移生成。`,
      });
    }
    result.features.push({
      fm: {
        id: /^FEAT-\d{3,}$/.test(id ?? '') ? id : undefined,
        title: name,
        status: mapStatus(status),
        priority: mapPriority(priority),
        assignee: assignee?.trim() || undefined,
        estimate: parseHours(estimate),
        skills: [],
        tags: tags ? tags.split(';').map((t) => t.trim()).filter(Boolean) : [],
      },
      body: description?.trim() || '',
      epicRef,
    });
  }
  result.epics = [...categories.values()];
  return result;
}

/* ---------- v1 富模型 pmspace/ 目录 ---------- */

function fieldOf(content: string, name: string): string | undefined {
  const re = new RegExp(`^-\\s*\\*\\*${name}\\*\\*\\s*[:：]\\s*(.+)$`, 'mi');
  const match = content.match(re);
  return match?.[1]?.trim();
}

function titleOf(content: string, kind: string): string | undefined {
  const re = new RegExp(`^#\\s*${kind}\\s*[:：]\\s*(.+)$`, 'mi');
  return content.match(re)?.[1]?.trim();
}

function sectionOf(content: string, heading: string): string | undefined {
  const re = new RegExp(`^##\\s*${heading}\\s*$([\\s\\S]*?)(?=^##\\s|\\s*$(?![\\s\\S]))`, 'mi');
  const match = content.match(re);
  return match?.[1]?.trim();
}

/** v1 富模型 feature 文件里的 user story 行: `- [ ] STORY-001: 描述 (4h)` */
const V1_STORY_RE = /^-\s*\[( |x|X)\]\s*(STORY-\d{3,})\s*[:：]\s*(.+?)(?:\s*[（(](\d+(?:\.\d+)?)\s*h[）)])?\s*$/gm;

export async function importV1Pmspace(dir: string): Promise<ImportResult> {
  const result: ImportResult = {
    format: 'v1-pmspace',
    epics: [],
    features: [],
    stories: [],
    warnings: [],
  };

  const readDirMd = async (sub: string): Promise<Array<{ file: string; content: string }>> => {
    const target = path.join(dir, sub);
    if (!existsSync(target)) return [];
    const files = await readdir(target);
    const out: Array<{ file: string; content: string }> = [];
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      out.push({
        file: path.join(target, file),
        content: await readFile(path.join(target, file), 'utf-8'),
      });
    }
    return out;
  };

  for (const { file, content } of await readDirMd('epics')) {
    const id = fieldOf(content, 'ID');
    const title = titleOf(content, 'Epic');
    if (!title) {
      result.warnings.push(`跳过无法解析标题的 Epic 文件: ${file}`);
      continue;
    }
    result.epics.push({
      fm: {
        id: id && /^EPIC-\d{3,}$/.test(id) ? id : undefined,
        title,
        status: mapStatus(fieldOf(content, 'Status')),
        owner: fieldOf(content, 'Owner'),
        estimate: parseHours(fieldOf(content, 'Estimate')),
        actual: parseHours(fieldOf(content, 'Actual')),
        tags: [],
      },
      body: sectionOf(content, 'Description') ?? '',
    });
  }

  for (const { file, content } of await readDirMd('features')) {
    const id = fieldOf(content, 'ID');
    const title = titleOf(content, 'Feature');
    if (!title) {
      result.warnings.push(`跳过无法解析标题的 Feature 文件: ${file}`);
      continue;
    }
    const skills = fieldOf(content, 'Skills Required');
    const featureId = id && /^FEAT-\d{3,}$/.test(id) ? id : undefined;
    const bodyParts: string[] = [];
    const description = sectionOf(content, 'Description');
    if (description) bodyParts.push(description);
    const acceptance = sectionOf(content, 'Acceptance Criteria');
    if (acceptance) bodyParts.push(`## 验收标准\n\n${acceptance}`);
    result.features.push({
      fm: {
        id: featureId,
        title,
        status: mapStatus(fieldOf(content, 'Status')),
        priority: mapPriority(fieldOf(content, 'Priority')),
        assignee: fieldOf(content, 'Assignee'),
        estimate: parseHours(fieldOf(content, 'Estimate')),
        actual: parseHours(fieldOf(content, 'Actual')),
        skills: skills ? skills.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [],
        tags: [],
      },
      body: bodyParts.join('\n\n'),
      epicRef: fieldOf(content, 'Epic'),
    });

    // Feature 正文中的 user story 清单 → Story 实体
    if (featureId) {
      for (const match of content.matchAll(V1_STORY_RE)) {
        const [, checked, storyId, text, hours] = match;
        result.stories.push({
          fm: {
            id: storyId,
            title: text.trim(),
            status: checked.toLowerCase() === 'x' ? 'done' : 'todo',
            estimate: hours ? Number(hours) : undefined,
          },
          body: '',
          featureRef: featureId,
        });
      }
    }
  }

  return result;
}

/* ---------- 通用 CSV ---------- */

const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  name: 'title',
  feature: 'title',
  功能: 'title',
  功能名称: 'title',
  标题: 'title',
  description: 'description',
  描述: 'description',
  说明: 'description',
  estimate: 'estimate',
  'estimate(h)': 'estimate',
  hours: 'estimate',
  工时: 'estimate',
  预估: 'estimate',
  '预估工作量(h)': 'estimate',
  assignee: 'assignee',
  owner: 'assignee',
  负责人: 'assignee',
  分配给: 'assignee',
  status: 'status',
  状态: 'status',
  priority: 'priority',
  优先级: 'priority',
  epic: 'epic',
  category: 'epic',
  分组: 'epic',
  模块: 'epic',
  tags: 'tags',
  标签: 'tags',
  id: 'id',
};

export function importGenericCsv(content: string): ImportResult {
  const rows = parseCsv(content);
  const result: ImportResult = {
    format: 'csv',
    epics: [],
    features: [],
    stories: [],
    warnings: [],
  };
  if (rows.length < 2) {
    result.warnings.push('CSV 中没有数据行');
    return result;
  }
  const header = rows[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? '');
  if (!header.includes('title')) {
    throw new Error(
      'CSV 缺少标题列（可识别列名：title/name/功能名称/标题 等）'
    );
  }
  const categories = new Map<string, ImportedEpic>();
  for (const row of rows.slice(1)) {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      if (key && row[index]) record[key] = row[index];
    });
    if (!record.title) {
      result.warnings.push(`跳过缺少标题的行: ${row.join(',')}`);
      continue;
    }
    const epicRef = record.epic?.trim() || undefined;
    if (epicRef && !categories.has(epicRef)) {
      categories.set(epicRef, {
        fm: { title: epicRef, status: 'todo', tags: [] },
        body: '',
      });
    }
    result.features.push({
      fm: {
        id: /^FEAT-\d{3,}$/.test(record.id ?? '') ? record.id : undefined,
        title: record.title,
        status: mapStatus(record.status),
        priority: mapPriority(record.priority),
        assignee: record.assignee || undefined,
        estimate: parseHours(record.estimate),
        skills: [],
        tags: record.tags
          ? record.tags.split(/[;，,]/).map((t) => t.trim()).filter(Boolean)
          : [],
      },
      body: record.description ?? '',
      epicRef,
    });
  }
  result.epics = [...categories.values()];
  return result;
}

/** 按 target 自动探测并导入 */
export async function runImport(target: string, format?: ImportFormat): Promise<ImportResult> {
  const resolved = format ?? (await detectFormat(target));
  switch (resolved) {
    case 'v1-pmspace':
      return importV1Pmspace(target);
    case 'v1-csv':
      return importV1Csv(await readFile(target, 'utf-8'));
    case 'csv':
      return importGenericCsv(await readFile(target, 'utf-8'));
  }
}
