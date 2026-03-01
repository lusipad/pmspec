import type { Feature, FeatureStatus } from '@pmspec/types';
import { getFeatures } from './dataService';
import { writeFeatureFile } from './csvService';

const DEFAULT_HOURS_PER_DAY = 8;
const planStore = new Map<string, PlanDraft>();

export type RebalanceStrategy = 'conservative' | 'balanced' | 'aggressive';

export interface PlanningBrief {
  goal: string;
  startDate: string;
  targetDate: string;
  teamCapacityHoursPerDay: number;
  constraints: string[];
}

export interface FeatureSchedule {
  featureId: string;
  title: string;
  epic: string;
  estimate: number;
  start: string;
  end: string;
  assignee: string;
  status: FeatureStatus;
  dependencies: string[];
}

export interface PlanDraft {
  id: string;
  brief: PlanningBrief;
  generatedAt: string;
  features: FeatureSchedule[];
  warnings: string[];
}

export interface PlanImpact {
  delayedFeatures: string[];
  overloadedAssignees: Array<{
    assignee: string;
    assignedHours: number;
    capacityHours: number;
  }>;
  dependencyRisks: Array<{
    featureId: string;
    blockedBy: string[];
  }>;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function fromIsoDate(input: string): Date {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addWorkingDays(start: Date, days: number): Date {
  const result = new Date(start);
  let remaining = Math.max(0, days);

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }

  return result;
}

function maxDate(...dates: Date[]): Date {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function sortFeatures(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => a.id.localeCompare(b.id));
}

function toFeatureStatus(status: string): FeatureStatus {
  if (status === 'done') return 'done';
  if (status === 'in-progress') return 'in-progress';
  return 'todo';
}

function sanitizeTitle(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function splitGoalIntoSteps(goal: string): string[] {
  const tokens = goal
    .split(/[\n，,。；;、]/g)
    .map((token) => sanitizeTitle(token))
    .filter((token) => token.length >= 4);

  const uniqueTokens = Array.from(new Set(tokens));
  if (uniqueTokens.length >= 3) {
    return uniqueTokens.slice(0, 8);
  }

  return [
    '需求澄清与范围确认',
    '技术方案与任务拆分',
    '核心功能开发',
    '联调与回归测试',
    '上线准备与验收',
  ];
}

function nextFeatureIds(features: Feature[], count: number): string[] {
  const usedNumbers = features
    .map((feature) => {
      const match = feature.id.match(/^FEAT-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => value > 0);

  let cursor = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
  const result: string[] = [];

  while (result.length < count) {
    result.push(`FEAT-${String(cursor).padStart(3, '0')}`);
    cursor += 1;
  }

  return result;
}

function decomposeGoalToFeatures(brief: PlanningBrief, existingFeatures: Feature[]): Feature[] {
  const steps = splitGoalIntoSteps(brief.goal);
  const generatedIds = nextFeatureIds(existingFeatures, steps.length);
  const defaultEstimates = [8, 12, 16, 12, 8, 8, 8, 8];

  return steps.map((step, index) => {
    const previousId = index > 0 ? generatedIds[index - 1] : undefined;
    return {
      id: generatedIds[index],
      epic: 'EPIC-PLAN',
      title: step,
      description: `来自快速引导自动拆分：${step}`,
      status: 'todo',
      priority: index === 0 ? 'high' : 'medium',
      assignee: '',
      estimate: defaultEstimates[index] ?? 8,
      actual: 0,
      skillsRequired: [],
      dependencies: previousId ? [{ featureId: previousId, type: 'blocks' }] : [],
    };
  });
}

function resolveDependencyMap(features: Feature[]): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const feature of features) {
    const deps = (feature.dependencies ?? [])
      .filter((dependency) => dependency.type === 'blocks')
      .map((dependency) => dependency.featureId);
    result.set(feature.id, deps);
  }

  return result;
}

function scheduleFeatures(features: Feature[], brief: PlanningBrief): Pick<PlanDraft, 'features' | 'warnings'> {
  const warnings: string[] = [];
  const featureMap = new Map(features.map((feature) => [feature.id, feature]));
  const dependencyMap = resolveDependencyMap(features);
  const scheduled = new Map<string, FeatureSchedule>();
  const remaining = new Set(features.map((feature) => feature.id));
  const assigneeAvailability = new Map<string, Date>();
  const projectStart = fromIsoDate(brief.startDate);
  const hoursPerDay = brief.teamCapacityHoursPerDay || DEFAULT_HOURS_PER_DAY;

  while (remaining.size > 0) {
    const readyIds = [...remaining].filter((featureId) => {
      const deps = dependencyMap.get(featureId) ?? [];
      return deps.every((depId) => scheduled.has(depId) || !featureMap.has(depId));
    });

    if (readyIds.length === 0) {
      // Break dependency cycles deterministically.
      const fallbackId = [...remaining].sort()[0];
      warnings.push(`Detected cyclic dependencies. Scheduled ${fallbackId} without waiting for blockers.`);
      readyIds.push(fallbackId);
    }

    for (const featureId of readyIds.sort()) {
      if (!remaining.has(featureId)) {
        continue;
      }

      const feature = featureMap.get(featureId);
      if (!feature) {
        remaining.delete(featureId);
        continue;
      }

      const assignee = feature.assignee || 'Unassigned';
      const deps = dependencyMap.get(featureId) ?? [];
      const depEndDates = deps
        .map((depId) => scheduled.get(depId))
        .filter((entry): entry is FeatureSchedule => Boolean(entry))
        .map((entry) => addWorkingDays(fromIsoDate(entry.end), 1));

      const dependencyStart = depEndDates.length > 0 ? maxDate(...depEndDates) : projectStart;
      const assigneeStart = assigneeAvailability.get(assignee) ?? projectStart;
      const startDate = maxDate(projectStart, dependencyStart, assigneeStart);
      const durationDays = Math.max(1, Math.ceil((feature.estimate || DEFAULT_HOURS_PER_DAY) / hoursPerDay));
      const endDate = addWorkingDays(startDate, durationDays - 1);

      scheduled.set(featureId, {
        featureId,
        title: feature.title,
        epic: feature.epic,
        estimate: feature.estimate || DEFAULT_HOURS_PER_DAY,
        start: toIsoDate(startDate),
        end: toIsoDate(endDate),
        assignee,
        status: toFeatureStatus(feature.status),
        dependencies: deps.filter((depId) => featureMap.has(depId)),
      });
      assigneeAvailability.set(assignee, addWorkingDays(endDate, 1));
      remaining.delete(featureId);
    }
  }

  return {
    features: [...scheduled.values()].sort((a, b) => a.featureId.localeCompare(b.featureId)),
    warnings,
  };
}

export async function generatePlanDraft(brief: PlanningBrief): Promise<PlanDraft> {
  const currentFeatures = sortFeatures(await getFeatures());
  const decomposedFeatures = decomposeGoalToFeatures(brief, currentFeatures);
  const features = decomposedFeatures.length > 0 ? decomposedFeatures : currentFeatures;
  const { features: schedules, warnings } = scheduleFeatures(features, brief);
  if (decomposedFeatures.length > 0) {
    warnings.push('已根据目标文本自动拆分为可执行 Feature 计划。');
  }
  const plan: PlanDraft = {
    id: `plan-${Date.now()}`,
    brief,
    generatedAt: new Date().toISOString(),
    features: schedules,
    warnings,
  };
  planStore.set(plan.id, plan);
  return plan;
}

export function getPlanDraft(planId: string): PlanDraft | null {
  return planStore.get(planId) ?? null;
}

export function updatePlanFeature(
  planId: string,
  featureId: string,
  updates: Partial<Pick<FeatureSchedule, 'start' | 'end' | 'assignee' | 'status'>>
): PlanDraft | null {
  const existing = planStore.get(planId);
  if (!existing) {
    return null;
  }

  const nextFeatures = existing.features.map((feature) =>
    feature.featureId === featureId ? { ...feature, ...updates } : feature
  );

  const nextPlan: PlanDraft = {
    ...existing,
    features: nextFeatures,
  };
  planStore.set(planId, nextPlan);
  return nextPlan;
}

export function batchUpdatePlanFeatures(
  planId: string,
  featureIds: string[],
  updates: Partial<Pick<FeatureSchedule, 'assignee' | 'status'>>
): PlanDraft | null {
  const existing = planStore.get(planId);
  if (!existing) {
    return null;
  }

  const target = new Set(featureIds);
  const nextFeatures = existing.features.map((feature) =>
    target.has(feature.featureId) ? { ...feature, ...updates } : feature
  );

  const nextPlan: PlanDraft = {
    ...existing,
    features: nextFeatures,
  };
  planStore.set(planId, nextPlan);
  return nextPlan;
}

export function rebalancePlan(planId: string, strategy: RebalanceStrategy): PlanDraft | null {
  const existing = planStore.get(planId);
  if (!existing) {
    return null;
  }

  const baseStart = fromIsoDate(existing.brief.startDate);
  const factor = strategy === 'aggressive' ? 0.8 : strategy === 'conservative' ? 1.2 : 1;
  const nextFeatures = [...existing.features]
    .sort((a, b) => a.start.localeCompare(b.start) || a.featureId.localeCompare(b.featureId))
    .map((feature, index) => {
      const originalStart = fromIsoDate(feature.start);
      const originalEnd = fromIsoDate(feature.end);
      const durationDays = Math.max(
        1,
        Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24))
      );
      const adjustedDays = Math.max(1, Math.round(durationDays * factor));
      const start = addWorkingDays(baseStart, index);
      const end = addWorkingDays(start, adjustedDays - 1);
      return {
        ...feature,
        start: toIsoDate(start),
        end: toIsoDate(end),
      };
    });

  const nextPlan: PlanDraft = {
    ...existing,
    features: nextFeatures,
  };
  planStore.set(planId, nextPlan);
  return nextPlan;
}

export function calculatePlanImpact(planId: string): PlanImpact | null {
  const plan = planStore.get(planId);
  if (!plan) {
    return null;
  }

  const delayedFeatures: string[] = [];
  const capacityByAssignee = new Map<string, number>();
  const assignedByAssignee = new Map<string, number>();
  const dependencyRisks: Array<{ featureId: string; blockedBy: string[] }> = [];

  const targetDate = fromIsoDate(plan.brief.targetDate);

  for (const feature of plan.features) {
    if (fromIsoDate(feature.end).getTime() > targetDate.getTime()) {
      delayedFeatures.push(feature.featureId);
    }

    const assignee = feature.assignee || 'Unassigned';
    const start = fromIsoDate(feature.start);
    const end = fromIsoDate(feature.end);
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const assignedHours = durationDays * plan.brief.teamCapacityHoursPerDay;

    assignedByAssignee.set(assignee, (assignedByAssignee.get(assignee) ?? 0) + assignedHours);
    capacityByAssignee.set(assignee, plan.brief.teamCapacityHoursPerDay * 10);

    const blockers = feature.dependencies.filter((depId) => {
      const blocker = plan.features.find((entry) => entry.featureId === depId);
      if (!blocker) {
        return false;
      }
      return fromIsoDate(blocker.end).getTime() > fromIsoDate(feature.start).getTime();
    });

    if (blockers.length > 0) {
      dependencyRisks.push({
        featureId: feature.featureId,
        blockedBy: blockers,
      });
    }
  }

  return {
    delayedFeatures,
    overloadedAssignees: [...assignedByAssignee.entries()]
      .filter(([assignee, assignedHours]) => assignedHours > (capacityByAssignee.get(assignee) ?? 0))
      .map(([assignee, assignedHours]) => ({
        assignee,
        assignedHours,
        capacityHours: capacityByAssignee.get(assignee) ?? 0,
      })),
    dependencyRisks,
  };
}

export async function confirmPlan(planId: string): Promise<PlanDraft | null> {
  const plan = planStore.get(planId);
  if (!plan) {
    return null;
  }

  const features = await getFeatures();
  const featureMap = new Map(features.map((feature) => [feature.id, feature]));

  for (const schedule of plan.features) {
    const existing = featureMap.get(schedule.featureId);
    if (!existing) {
      continue;
    }

    await writeFeatureFile({
      ...existing,
      title: schedule.title,
      epic: schedule.epic || existing.epic || 'EPIC-PLAN',
      assignee: schedule.assignee,
      status: schedule.status,
      estimate: schedule.estimate,
    });
  }

  for (const schedule of plan.features) {
    if (featureMap.has(schedule.featureId)) {
      continue;
    }

    await writeFeatureFile({
      id: schedule.featureId,
      epic: schedule.epic || 'EPIC-PLAN',
      title: schedule.title || schedule.featureId,
      description: `由快速引导生成：${schedule.title || schedule.featureId}`,
      status: schedule.status,
      priority: 'medium',
      assignee: schedule.assignee,
      estimate: schedule.estimate,
      actual: 0,
      skillsRequired: [],
      dependencies: schedule.dependencies.map((dependencyId) => ({
        featureId: dependencyId,
        type: 'blocks',
      })),
    });
  }

  return plan;
}
