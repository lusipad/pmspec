import path from 'path';
import { Workspace, allEntities } from './workspace.js';

/**
 * 工作区完整性校验（对应 spec：project-data / 数据完整性校验）。
 * - error：数据坏了，validate 命令以非零退出码失败
 * - warning：可疑但不阻塞（技能缺口、未知负责人等）
 */

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  file?: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function validateWorkspace(ws: Workspace): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const rel = (file: string) => path.relative(ws.root, file);

  // 1. 加载阶段错误（YAML 解析失败 / schema 校验失败 / 状态与工时非法都在此暴露）
  for (const issue of ws.issues) {
    errors.push({
      level: 'error',
      code: 'parse-error',
      message: issue.message,
      file: rel(issue.file),
    });
  }

  // 2. ID 唯一性
  const seen = new Map<string, string>();
  for (const { loaded } of allEntities(ws)) {
    const id = loaded.entity.id;
    const existing = seen.get(id);
    if (existing) {
      errors.push({
        level: 'error',
        code: 'duplicate-id',
        message: `ID ${id} 重复（已出现在 ${existing}）`,
        file: rel(loaded.file),
      });
    } else {
      seen.set(id, rel(loaded.file));
    }
  }

  // 3. 文件名与 ID 一致性
  for (const { loaded } of allEntities(ws)) {
    const expected = `${loaded.entity.id}.md`;
    if (path.basename(loaded.file) !== expected) {
      warnings.push({
        level: 'warning',
        code: 'filename-mismatch',
        message: `文件名与 ID 不一致（期望 ${expected}）`,
        file: rel(loaded.file),
      });
    }
  }

  // 4. 引用完整性
  const epicIds = new Set(ws.epics.map((e) => e.entity.id));
  const featureIds = new Set(ws.features.map((f) => f.entity.id));
  for (const f of ws.features) {
    if (f.entity.epic && !epicIds.has(f.entity.epic)) {
      errors.push({
        level: 'error',
        code: 'missing-epic',
        message: `${f.entity.id} 引用的 ${f.entity.epic} 不存在`,
        file: rel(f.file),
      });
    }
  }
  for (const s of ws.stories) {
    if (!featureIds.has(s.entity.feature)) {
      errors.push({
        level: 'error',
        code: 'missing-feature',
        message: `${s.entity.id} 引用的 ${s.entity.feature} 不存在`,
        file: rel(s.file),
      });
    }
  }

  // 5. 团队一致性（仅当 team.md 存在且有成员时检查；warning 级）
  const members = ws.team?.data.members ?? [];
  if (members.length > 0) {
    const memberNames = new Set(members.map((m) => m.name.toLowerCase()));
    const teamSkills = new Set(
      members.flatMap((m) => m.skills.map((s) => s.toLowerCase()))
    );

    for (const f of ws.features) {
      for (const skill of f.entity.skills) {
        if (!teamSkills.has(skill.toLowerCase())) {
          warnings.push({
            level: 'warning',
            code: 'unknown-skill',
            message: `${f.entity.id} 需要技能 "${skill}"，但团队中无人具备`,
            file: rel(f.file),
          });
        }
      }
    }

    const assignables: Array<{ id: string; assignee?: string; file: string }> = [
      ...ws.features.map((f) => ({
        id: f.entity.id,
        assignee: f.entity.assignee,
        file: f.file,
      })),
      ...ws.stories.map((s) => ({
        id: s.entity.id,
        assignee: s.entity.assignee,
        file: s.file,
      })),
    ];
    for (const item of assignables) {
      if (item.assignee && !memberNames.has(item.assignee.toLowerCase())) {
        warnings.push({
          level: 'warning',
          code: 'unknown-assignee',
          message: `${item.id} 的负责人 "${item.assignee}" 不在 team.md 中`,
          file: rel(item.file),
        });
      }
    }
  }

  return { errors, warnings };
}
