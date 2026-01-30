/**
 * External Tool Importers Module
 * 
 * Provides import functionality from external project management tools:
 * - Jira: Epic → Category, Story/Task → Feature
 * - Linear: Project → Epic, Issue → Feature
 * - GitHub Issues: Milestone → Milestone, Issue → Feature, Labels → Skills/Tags
 * 
 * Run `node setup-importers.js` from project root to extract this into 
 * separate files under src/importers/ directory.
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import type { SimpleFeature } from './simple-model.js';
import { CSVHandler } from '../utils/csv-handler.js';

// ============================================================================
// Types
// ============================================================================

export type ImportSource = 'jira' | 'linear' | 'github';

export const ImportOptionsSchema = z.object({
  file: z.string().optional(),
  content: z.string().optional(),
  dryRun: z.boolean().default(false),
  merge: z.boolean().default(false),
  outputFile: z.string().default('features.csv'),
});

export type ImportOptions = z.infer<typeof ImportOptionsSchema>;

export interface ImportResult {
  success: boolean;
  source: ImportSource;
  features: SimpleFeature[];
  epics: ImportedEpic[];
  milestones: ImportedMilestone[];
  errors: ImportError[];
  warnings: ImportWarning[];
  stats: ImportStats;
}

export interface ImportedEpic {
  id: string;
  name: string;
  description: string;
  originalId?: string;
  originalType?: string;
}

export interface ImportedMilestone {
  id: string;
  name: string;
  description: string;
  dueDate?: string;
  originalId?: string;
}

export interface ImportError {
  row?: number;
  field?: string;
  message: string;
  originalItem?: unknown;
}

export interface ImportWarning {
  row?: number;
  field?: string;
  message: string;
}

export interface ImportStats {
  totalItems: number;
  featuresImported: number;
  epicsImported: number;
  milestonesImported: number;
  skipped: number;
  errors: number;
}

export interface Importer {
  name: string;
  source: ImportSource;
  description: string;
  validate(content: string): Promise<{ valid: boolean; errors: string[] }>;
  import(options: ImportOptions): Promise<ImportResult>;
  preview(options: ImportOptions): Promise<ImportResult>;
}

// ============================================================================
// Jira Types
// ============================================================================

export const JiraIssueSchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    description: z.string().nullable().optional(),
    issuetype: z.object({ name: z.string() }),
    status: z.object({ name: z.string() }),
    priority: z.object({ name: z.string() }).optional(),
    assignee: z.object({ displayName: z.string() }).nullable().optional(),
    labels: z.array(z.string()).default([]),
    timeoriginalestimate: z.number().nullable().optional(),
    created: z.string().optional(),
    duedate: z.string().nullable().optional(),
    parent: z.object({
      key: z.string(),
      fields: z.object({
        summary: z.string(),
        issuetype: z.object({ name: z.string() }),
      }),
    }).optional(),
    customfield_10014: z.string().nullable().optional(),
  }),
});

export type JiraIssue = z.infer<typeof JiraIssueSchema>;
export const JiraExportSchema = z.object({ issues: z.array(JiraIssueSchema) });
export type JiraExport = z.infer<typeof JiraExportSchema>;

// ============================================================================
// Linear Types
// ============================================================================

export const LinearIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  state: z.object({ name: z.string(), type: z.string() }),
  priority: z.number(),
  priorityLabel: z.string(),
  estimate: z.number().nullable().optional(),
  assignee: z.object({ name: z.string() }).nullable().optional(),
  labels: z.object({ nodes: z.array(z.object({ name: z.string() })) }).optional(),
  createdAt: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
  }).nullable().optional(),
});

export type LinearIssue = z.infer<typeof LinearIssueSchema>;
export const LinearExportSchema = z.object({
  issues: z.array(LinearIssueSchema),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
  })).optional(),
});
export type LinearExport = z.infer<typeof LinearExportSchema>;

// ============================================================================
// GitHub Types
// ============================================================================

export const GitHubIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  state: z.enum(['open', 'closed']),
  labels: z.array(z.object({ name: z.string() })).default([]),
  assignee: z.object({ login: z.string() }).nullable().optional(),
  assignees: z.array(z.object({ login: z.string() })).optional(),
  milestone: z.object({
    number: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
  }).nullable().optional(),
  created_at: z.string().optional(),
});

export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;
export const GitHubExportSchema = z.object({
  issues: z.array(GitHubIssueSchema),
  milestones: z.array(z.object({
    number: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
  })).optional(),
});
export type GitHubExport = z.infer<typeof GitHubExportSchema>;

// ============================================================================
// Base Importer
// ============================================================================

abstract class BaseImporter implements Importer {
  abstract name: string;
  abstract source: ImportSource;
  abstract description: string;

  protected async getContent(options: ImportOptions): Promise<string> {
    if (options.content) return options.content;
    if (options.file) return await readFile(options.file, 'utf-8');
    throw new Error('Either file path or content must be provided');
  }

  protected parseJSON<T>(content: string): T {
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected createEmptyResult(): ImportResult {
    return {
      success: false,
      source: this.source,
      features: [],
      epics: [],
      milestones: [],
      errors: [],
      warnings: [],
      stats: { totalItems: 0, featuresImported: 0, epicsImported: 0, milestonesImported: 0, skipped: 0, errors: 0 },
    };
  }

  protected generateFeatureId(prefix: string, index: number): string {
    return `${prefix}-${String(index).padStart(3, '0')}`;
  }

  protected mapPriority(priority: string): 'low' | 'medium' | 'high' | 'critical' {
    const normalized = priority.toLowerCase();
    if (['critical', 'blocker', 'highest', 'urgent', '1'].includes(normalized)) return 'critical';
    if (['high', '2'].includes(normalized)) return 'high';
    if (['low', 'lowest', 'trivial', '4', '5'].includes(normalized)) return 'low';
    return 'medium';
  }

  protected mapStatus(status: string): 'todo' | 'in-progress' | 'done' | 'blocked' {
    const normalized = status.toLowerCase();
    if (['done', 'closed', 'completed', 'resolved', 'finished'].includes(normalized)) return 'done';
    if (['in progress', 'in-progress', 'inprogress', 'started', 'active', 'working'].includes(normalized)) return 'in-progress';
    if (['blocked', 'on hold', 'waiting', 'pending'].includes(normalized)) return 'blocked';
    return 'todo';
  }

  protected formatDate(date: string | null | undefined): string | undefined {
    if (!date) return undefined;
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return undefined;
    }
  }

  protected convertToHours(seconds: number | null | undefined): number {
    if (!seconds) return 8;
    return Math.ceil(seconds / 3600);
  }

  protected sanitizeId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  }

  abstract validate(content: string): Promise<{ valid: boolean; errors: string[] }>;
  abstract import(options: ImportOptions): Promise<ImportResult>;

  async preview(options: ImportOptions): Promise<ImportResult> {
    return this.import({ ...options, dryRun: true });
  }

  protected async writeFeatures(features: SimpleFeature[], outputFile: string, merge: boolean): Promise<void> {
    if (merge) {
      try {
        const existingFeatures = await CSVHandler.readFeatures(outputFile);
        const mergedFeatures = [...existingFeatures];
        for (const feature of features) {
          const existingIndex = mergedFeatures.findIndex(f => f.id === feature.id);
          if (existingIndex >= 0) mergedFeatures[existingIndex] = feature;
          else mergedFeatures.push(feature);
        }
        await CSVHandler.writeFeatures(outputFile, mergedFeatures);
      } catch {
        await CSVHandler.writeFeatures(outputFile, features);
      }
    } else {
      await CSVHandler.writeFeatures(outputFile, features);
    }
  }
}

// ============================================================================
// Jira Importer
// ============================================================================

export class JiraImporter extends BaseImporter {
  name = 'Jira Importer';
  source: ImportSource = 'jira';
  description = 'Import issues from Jira JSON export file';

  async validate(content: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      const data = this.parseJSON<unknown>(content);
      const result = JiraExportSchema.safeParse(data);
      if (!result.success) {
        errors.push('Invalid Jira export format');
        result.error.issues.forEach(err => errors.push(`${err.path.join('.')}: ${err.message}`));
        return { valid: false, errors };
      }
      if (result.data.issues.length === 0) {
        errors.push('No issues found in export');
        return { valid: false, errors };
      }
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const result = this.createEmptyResult();
    try {
      const content = await this.getContent(options);
      const parseResult = JiraExportSchema.safeParse(this.parseJSON<unknown>(content));
      if (!parseResult.success) {
        result.errors.push({ message: 'Invalid Jira export format' });
        return result;
      }
      const jiraData = parseResult.data;
      result.stats.totalItems = jiraData.issues.length;
      
      const epicsMap = this.extractEpics(jiraData.issues);
      result.epics = Array.from(epicsMap.values());
      result.stats.epicsImported = result.epics.length;
      
      let featureIndex = 1;
      for (const issue of jiraData.issues) {
        try {
          if (issue.fields.issuetype.name.toLowerCase() === 'epic') continue;
          const feature = this.mapIssueToFeature(issue, featureIndex, epicsMap);
          result.features.push(feature);
          featureIndex++;
          result.stats.featuresImported++;
        } catch (error) {
          result.errors.push({
            field: issue.key,
            message: error instanceof Error ? error.message : 'Failed to import issue',
            originalItem: issue,
          });
          result.stats.errors++;
        }
      }
      
      if (!options.dryRun && result.features.length > 0) {
        await this.writeFeatures(result.features, options.outputFile || 'features.csv', options.merge || false);
      }
      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push({ message: error instanceof Error ? error.message : 'Import failed' });
      return result;
    }
  }

  private extractEpics(issues: JiraIssue[]): Map<string, ImportedEpic> {
    const epics = new Map<string, ImportedEpic>();
    for (const issue of issues) {
      if (issue.fields.issuetype.name.toLowerCase() === 'epic') {
        epics.set(issue.key, {
          id: this.sanitizeId(issue.fields.summary),
          name: issue.fields.summary,
          description: issue.fields.description || '',
          originalId: issue.key,
          originalType: 'Epic',
        });
      }
    }
    for (const issue of issues) {
      const epicKey = issue.fields.parent?.key || issue.fields.customfield_10014;
      if (epicKey && !epics.has(epicKey)) {
        const parentSummary = issue.fields.parent?.fields.summary || epicKey;
        epics.set(epicKey, {
          id: this.sanitizeId(parentSummary),
          name: parentSummary,
          description: '',
          originalId: epicKey,
          originalType: 'Epic',
        });
      }
    }
    return epics;
  }

  private mapIssueToFeature(issue: JiraIssue, index: number, epicsMap: Map<string, ImportedEpic>): SimpleFeature {
    const epicKey = issue.fields.parent?.key || issue.fields.customfield_10014;
    const epic = epicKey ? epicsMap.get(epicKey) : undefined;
    return {
      id: this.generateFeatureId('feat', index),
      name: issue.fields.summary,
      description: issue.fields.description || issue.fields.summary,
      estimate: this.convertToHours(issue.fields.timeoriginalestimate),
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: this.mapPriority(issue.fields.priority?.name || 'medium'),
      status: this.mapStatus(issue.fields.status.name),
      category: epic?.name || 'Uncategorized',
      tags: [issue.fields.issuetype.name, ...issue.fields.labels, `jira:${issue.key}`],
      createdDate: this.formatDate(issue.fields.created),
      dueDate: this.formatDate(issue.fields.duedate),
    };
  }
}

// ============================================================================
// Linear Importer
// ============================================================================

export class LinearImporter extends BaseImporter {
  name = 'Linear Importer';
  source: ImportSource = 'linear';
  description = 'Import issues from Linear JSON export file';

  async validate(content: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      const data = this.parseJSON<unknown>(content);
      const result = LinearExportSchema.safeParse(data);
      if (!result.success) {
        errors.push('Invalid Linear export format');
        result.error.issues.forEach(err => errors.push(`${err.path.join('.')}: ${err.message}`));
        return { valid: false, errors };
      }
      if (result.data.issues.length === 0) {
        errors.push('No issues found in export');
        return { valid: false, errors };
      }
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const result = this.createEmptyResult();
    try {
      const content = await this.getContent(options);
      const parseResult = LinearExportSchema.safeParse(this.parseJSON<unknown>(content));
      if (!parseResult.success) {
        result.errors.push({ message: 'Invalid Linear export format' });
        return result;
      }
      const linearData = parseResult.data;
      result.stats.totalItems = linearData.issues.length;
      
      const projectsMap = this.extractProjects(linearData);
      result.epics = Array.from(projectsMap.values());
      result.stats.epicsImported = result.epics.length;
      
      let featureIndex = 1;
      for (const issue of linearData.issues) {
        try {
          const feature = this.mapIssueToFeature(issue, featureIndex, projectsMap);
          result.features.push(feature);
          featureIndex++;
          result.stats.featuresImported++;
        } catch (error) {
          result.errors.push({
            field: issue.identifier,
            message: error instanceof Error ? error.message : 'Failed to import issue',
            originalItem: issue,
          });
          result.stats.errors++;
        }
      }
      
      if (!options.dryRun && result.features.length > 0) {
        await this.writeFeatures(result.features, options.outputFile || 'features.csv', options.merge || false);
      }
      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push({ message: error instanceof Error ? error.message : 'Import failed' });
      return result;
    }
  }

  private extractProjects(data: LinearExport): Map<string, ImportedEpic> {
    const projects = new Map<string, ImportedEpic>();
    if (data.projects) {
      for (const project of data.projects) {
        projects.set(project.id, {
          id: this.sanitizeId(project.name),
          name: project.name,
          description: project.description || '',
          originalId: project.id,
          originalType: 'Project',
        });
      }
    }
    for (const issue of data.issues) {
      if (issue.project && !projects.has(issue.project.id)) {
        projects.set(issue.project.id, {
          id: this.sanitizeId(issue.project.name),
          name: issue.project.name,
          description: issue.project.description || '',
          originalId: issue.project.id,
          originalType: 'Project',
        });
      }
    }
    return projects;
  }

  private mapLinearPriority(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    switch (priority) {
      case 1: return 'critical';
      case 2: return 'high';
      case 3: return 'medium';
      case 4: return 'low';
      default: return 'medium';
    }
  }

  private mapLinearState(state: { name: string; type: string }): 'todo' | 'in-progress' | 'done' | 'blocked' {
    const type = state.type.toLowerCase();
    switch (type) {
      case 'completed':
      case 'done': return 'done';
      case 'started':
      case 'inprogress': return 'in-progress';
      case 'backlog':
      case 'unstarted':
      case 'triage': return 'todo';
      case 'canceled':
      case 'cancelled': return 'blocked';
      default: return this.mapStatus(state.name);
    }
  }

  private mapIssueToFeature(issue: LinearIssue, index: number, projectsMap: Map<string, ImportedEpic>): SimpleFeature {
    const project = issue.project ? projectsMap.get(issue.project.id) : undefined;
    const labels = issue.labels?.nodes?.map(l => l.name) || [];
    return {
      id: this.generateFeatureId('feat', index),
      name: issue.title,
      description: issue.description || issue.title,
      estimate: issue.estimate ? issue.estimate * 4 : 8,
      assignee: issue.assignee?.name || 'Unassigned',
      priority: this.mapLinearPriority(issue.priority),
      status: this.mapLinearState(issue.state),
      category: project?.name || 'Uncategorized',
      tags: [...labels, `linear:${issue.identifier}`],
      createdDate: this.formatDate(issue.createdAt),
      dueDate: this.formatDate(issue.dueDate),
    };
  }
}

// ============================================================================
// GitHub Importer
// ============================================================================

const SKILL_LABEL_PREFIXES = ['skill:', 'tech:', 'language:', 'framework:'];

export class GitHubImporter extends BaseImporter {
  name = 'GitHub Issues Importer';
  source: ImportSource = 'github';
  description = 'Import issues from GitHub API export or JSON file';

  async validate(content: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    try {
      const data = this.parseJSON<unknown>(content);
      const normalized = Array.isArray(data) ? { issues: data } : data;
      const result = GitHubExportSchema.safeParse(normalized);
      if (!result.success) {
        errors.push('Invalid GitHub export format');
        result.error.issues.forEach(err => errors.push(`${err.path.join('.')}: ${err.message}`));
        return { valid: false, errors };
      }
      if (result.data.issues.length === 0) {
        errors.push('No issues found in export');
        return { valid: false, errors };
      }
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const result = this.createEmptyResult();
    try {
      const content = await this.getContent(options);
      const rawData = this.parseJSON<unknown>(content);
      const normalized = Array.isArray(rawData) ? { issues: rawData } : rawData;
      const parseResult = GitHubExportSchema.safeParse(normalized);
      if (!parseResult.success) {
        result.errors.push({ message: 'Invalid GitHub export format' });
        return result;
      }
      const githubData = parseResult.data;
      result.stats.totalItems = githubData.issues.length;
      
      const milestonesMap = this.extractMilestones(githubData);
      result.milestones = Array.from(milestonesMap.values());
      result.stats.milestonesImported = result.milestones.length;
      
      const epicsMap = this.extractEpicsFromLabels(githubData.issues);
      result.epics = Array.from(epicsMap.values());
      result.stats.epicsImported = result.epics.length;
      
      let featureIndex = 1;
      for (const issue of githubData.issues) {
        try {
          const feature = this.mapIssueToFeature(issue, featureIndex, milestonesMap, epicsMap);
          result.features.push(feature);
          featureIndex++;
          result.stats.featuresImported++;
        } catch (error) {
          result.errors.push({
            field: `#${issue.number}`,
            message: error instanceof Error ? error.message : 'Failed to import issue',
            originalItem: issue,
          });
          result.stats.errors++;
        }
      }
      
      if (!options.dryRun && result.features.length > 0) {
        await this.writeFeatures(result.features, options.outputFile || 'features.csv', options.merge || false);
      }
      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push({ message: error instanceof Error ? error.message : 'Import failed' });
      return result;
    }
  }

  private extractMilestones(data: GitHubExport): Map<number, ImportedMilestone> {
    const milestones = new Map<number, ImportedMilestone>();
    if (data.milestones) {
      for (const milestone of data.milestones) {
        milestones.set(milestone.number, {
          id: this.sanitizeId(milestone.title),
          name: milestone.title,
          description: milestone.description || '',
          dueDate: this.formatDate(milestone.due_on),
          originalId: String(milestone.number),
        });
      }
    }
    for (const issue of data.issues) {
      if (issue.milestone && !milestones.has(issue.milestone.number)) {
        milestones.set(issue.milestone.number, {
          id: this.sanitizeId(issue.milestone.title),
          name: issue.milestone.title,
          description: issue.milestone.description || '',
          dueDate: this.formatDate(issue.milestone.due_on),
          originalId: String(issue.milestone.number),
        });
      }
    }
    return milestones;
  }

  private extractEpicsFromLabels(issues: GitHubIssue[]): Map<string, ImportedEpic> {
    const epics = new Map<string, ImportedEpic>();
    const epicPrefixes = ['epic:', 'category:', 'area:'];
    for (const issue of issues) {
      for (const label of issue.labels) {
        const lowerName = label.name.toLowerCase();
        for (const prefix of epicPrefixes) {
          if (lowerName.startsWith(prefix)) {
            const epicName = label.name.substring(prefix.length).trim();
            if (!epics.has(epicName)) {
              epics.set(epicName, {
                id: this.sanitizeId(epicName),
                name: epicName,
                description: `Imported from GitHub label: ${label.name}`,
                originalId: label.name,
                originalType: 'Label',
              });
            }
            break;
          }
        }
      }
    }
    return epics;
  }

  private extractSkillsFromLabels(labels: { name: string }[]): string[] {
    const skills: string[] = [];
    for (const label of labels) {
      const lowerName = label.name.toLowerCase();
      for (const prefix of SKILL_LABEL_PREFIXES) {
        if (lowerName.startsWith(prefix)) {
          skills.push(label.name.substring(prefix.length).trim());
          break;
        }
      }
    }
    return skills;
  }

  private extractCategoryFromLabels(labels: { name: string }[], epicsMap: Map<string, ImportedEpic>): string {
    const epicPrefixes = ['epic:', 'category:', 'area:'];
    for (const label of labels) {
      const lowerName = label.name.toLowerCase();
      for (const prefix of epicPrefixes) {
        if (lowerName.startsWith(prefix)) {
          const epicName = label.name.substring(prefix.length).trim();
          if (epicsMap.has(epicName)) return epicName;
        }
      }
    }
    return 'Uncategorized';
  }

  private extractPriorityFromLabels(labels: { name: string }[]): 'low' | 'medium' | 'high' | 'critical' {
    const priorityPrefixes = ['priority:', 'p:'];
    for (const label of labels) {
      const lowerName = label.name.toLowerCase();
      for (const prefix of priorityPrefixes) {
        if (lowerName.startsWith(prefix)) {
          return this.mapPriority(lowerName.substring(prefix.length).trim());
        }
      }
      if (['critical', 'blocker', 'urgent'].includes(lowerName)) return 'critical';
      if (['high', 'important'].includes(lowerName)) return 'high';
      if (['low', 'minor', 'trivial'].includes(lowerName)) return 'low';
    }
    return 'medium';
  }

  private extractEstimateFromLabels(labels: { name: string }[]): number {
    const estimatePrefixes = ['estimate:', 'size:', 'points:'];
    for (const label of labels) {
      const lowerName = label.name.toLowerCase();
      for (const prefix of estimatePrefixes) {
        if (lowerName.startsWith(prefix)) {
          const value = lowerName.substring(prefix.length).trim();
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) return parsed * 4;
        }
      }
      if (['xs', 'extra-small'].includes(lowerName)) return 2;
      if (['s', 'small'].includes(lowerName)) return 4;
      if (['m', 'medium'].includes(lowerName)) return 8;
      if (['l', 'large'].includes(lowerName)) return 16;
      if (['xl', 'extra-large'].includes(lowerName)) return 32;
    }
    return 8;
  }

  private mapIssueToFeature(
    issue: GitHubIssue,
    index: number,
    milestonesMap: Map<number, ImportedMilestone>,
    epicsMap: Map<string, ImportedEpic>
  ): SimpleFeature {
    const category = this.extractCategoryFromLabels(issue.labels, epicsMap);
    const priority = this.extractPriorityFromLabels(issue.labels);
    const status = issue.state === 'closed' ? 'done' : 'todo';
    const estimate = this.extractEstimateFromLabels(issue.labels);
    const assignee = issue.assignee?.login || 
      (issue.assignees && issue.assignees.length > 0 ? issue.assignees[0].login : 'Unassigned');
    
    const skills = this.extractSkillsFromLabels(issue.labels);
    const otherLabels = issue.labels.map(l => l.name).filter(name => {
      const lower = name.toLowerCase();
      const excludePrefixes = [...SKILL_LABEL_PREFIXES, 'epic:', 'category:', 'area:', 'priority:', 'p:', 'estimate:', 'size:', 'points:'];
      return !excludePrefixes.some(p => lower.startsWith(p)) &&
        !['critical', 'blocker', 'urgent', 'high', 'important', 'low', 'minor', 'trivial',
          'xs', 'extra-small', 's', 'small', 'm', 'medium', 'l', 'large', 'xl', 'extra-large'].includes(lower);
    });
    
    const tags = [...skills, ...otherLabels, `github:#${issue.number}`];
    if (issue.milestone) tags.push(`milestone:${issue.milestone.title}`);
    
    return {
      id: this.generateFeatureId('feat', index),
      name: issue.title,
      description: issue.body || issue.title,
      estimate,
      assignee,
      priority,
      status,
      category,
      tags,
      createdDate: this.formatDate(issue.created_at),
      dueDate: issue.milestone?.due_on ? this.formatDate(issue.milestone.due_on) : undefined,
    };
  }
}

// ============================================================================
// Importer Registry
// ============================================================================

export const jiraImporter = new JiraImporter();
export const linearImporter = new LinearImporter();
export const githubImporter = new GitHubImporter();

const importerRegistry: Record<ImportSource, Importer> = {
  jira: jiraImporter,
  linear: linearImporter,
  github: githubImporter,
};

export function getImporter(source: ImportSource): Importer {
  const importer = importerRegistry[source];
  if (!importer) throw new Error(`Unknown import source: ${source}`);
  return importer;
}

export function getAllImporters(): Importer[] {
  return Object.values(importerRegistry);
}

export function isValidSource(source: string): source is ImportSource {
  return source in importerRegistry;
}
