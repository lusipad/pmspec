import type { SimpleFeature, FeaturesTable } from '../core/simple-model.js';
import { readFile, writeFile } from 'fs/promises';

export class CSVHandler {
  static CSV_HEADERS = [
    'ID',
    '功能名称',
    '描述',
    '预估工作量(h)',
    '分配给',
    '优先级',
    '状态',
    '分组',
    '标签',
    '创建日期',
    '截止日期'
  ];

  static parseCSV(content: string): SimpleFeature[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV 文件至少需要标题行和一���数据');
    }

    const features: SimpleFeature[] = [];

    // 跳过标题行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 简单的 CSV 解析（假设不包含逗号）
      const fields = line.split(',').map(field => field.trim());

      if (fields.length >= 7) {
        features.push({
          id: fields[0],
          name: fields[1],
          description: fields[2],
          estimate: parseFloat(fields[3]) || 1,
          assignee: fields[4],
          priority: this.parsePriority(fields[5]),
          status: this.parseStatus(fields[6]),
          category: fields[7] || undefined,
          tags: fields[8] ? fields[8].split(';').map(t => t.trim()) : [],
          createdDate: fields[9] || undefined,
          dueDate: fields[10] || undefined,
        });
      }
    }

    return features;
  }

  static generateCSV(features: SimpleFeature[]): string {
    const lines = [this.CSV_HEADERS.join(',')];

    for (const feature of features) {
      const row = [
        feature.id,
        feature.name,
        feature.description,
        feature.estimate.toString(),
        feature.assignee,
        feature.priority,
        feature.status,
        feature.category || '',
        feature.tags.join(';'),
        feature.createdDate || '',
        feature.dueDate || ''
      ];

      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  static parseMarkdown(content: string): SimpleFeature[] {
    const features: SimpleFeature[] = [];
    const lines = content.trim().split('\n');
    let currentFeature: Partial<SimpleFeature> = {};
    let inFeature = false;

    for (const line of lines) {
      if (line.startsWith('# Feature:')) {
        if (inFeature && currentFeature.id) {
          features.push(this.completeFeature(currentFeature));
        }

        const name = line.replace('# Feature:', '').trim();
        currentFeature = {
          id: this.generateId(name, features),
          name
        };
      } else if (line.startsWith('- **描述**:')) {
        currentFeature.description = line.replace('- **描述**:', '').trim();
      } else if (line.startsWith('- **预估工作量**:')) {
        const hours = line.replace('- **预估工作量**:', '').replace('h', '').trim();
        currentFeature.estimate = parseFloat(hours) || 1;
      } else if (line.startsWith('- **分配给**:')) {
        currentFeature.assignee = line.replace('- **分配给**:', '').trim();
      } else if (line.startsWith('- **优先级**:')) {
        currentFeature.priority = this.parsePriority(line.replace('- **优先级**:', '').trim());
      } else if (line.startsWith('- **状态**:')) {
        currentFeature.status = this.parseStatus(line.replace('- **状态**:', '').trim());
      } else if (line.startsWith('- **分组**:')) {
        currentFeature.category = line.replace('- **分组**:', '').trim();
      } else if (line.startsWith('- **标签**:')) {
        const tags = line.replace('- **标签**:', '').trim();
        currentFeature.tags = tags.split(',').map(t => t.trim());
      }
    }

    if (currentFeature.id && currentFeature.name) {
      features.push(this.completeFeature(currentFeature));
    }

    return features;
  }

  static generateMarkdown(features: SimpleFeature[]): string {
    const lines = ['# 功能列表\n'];

    for (const feature of features) {
      lines.push(`\n# Feature: ${feature.name}`);
      lines.push(`- **ID**: ${feature.id}`);
      lines.push(`- **描述**: ${feature.description}`);
      lines.push(`- **预估工作量**: ${feature.estimate}h`);
      lines.push(`- **分配给**: ${feature.assignee}`);
      lines.push(`- **优先级**: ${feature.priority}`);
      lines.push(`- **状态**: ${feature.status}`);
      if (feature.category) {
        lines.push(`- **分组**: ${feature.category}`);
      }
      if (feature.tags.length > 0) {
        lines.push(`- **标签**: ${feature.tags.join(', ')}`);
      }
      lines.push('---');
    }

    return lines.join('\n');
  }

  private static parsePriority(priority: string): 'low' | 'medium' | 'high' | 'critical' {
    const p = priority.toLowerCase();
    if (['low', '低', 'l'].includes(p)) return 'low';
    if (['medium', '中', 'm'].includes(p)) return 'medium';
    if (['high', '高', 'h'].includes(p)) return 'high';
    if (['critical', '紧急', 'critical', 'c'].includes(p)) return 'critical';
    return 'medium'; // 默认值
  }

  private static parseStatus(status: string): 'todo' | 'in-progress' | 'done' | 'blocked' {
    const s = status.toLowerCase();
    if (['todo', '待办', 't'].includes(s)) return 'todo';
    if (['in-progress', '进行中', 'ip', '进行'].includes(s)) return 'in-progress';
    if (['done', '完成', 'd', '已完成'].includes(s)) return 'done';
    if (['blocked', '阻塞', 'b', '阻塞中'].includes(s)) return 'blocked';
    return 'todo'; // 默认值
  }

  private static completeFeature(feature: Partial<SimpleFeature>): SimpleFeature {
    return {
      id: feature.id || '',
      name: feature.name || '',
      description: feature.description || '',
      estimate: feature.estimate || 1,
      assignee: feature.assignee || '未分配',
      priority: feature.priority || 'medium',
      status: feature.status || 'todo',
      category: feature.category,
      tags: feature.tags || [],
      createdDate: feature.createdDate,
      dueDate: feature.dueDate,
    };
  }

  private static generateId(name: string, existing: SimpleFeature[]): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let id = `feat-${base}`;
    let counter = 1;

    while (existing.some(f => f.id === id)) {
      id = `feat-${base}-${counter}`;
      counter++;
    }

    return id;
  }

  static async readFeatures(filePath: string): Promise<SimpleFeature[]> {
    try {
      const content = await readFile(filePath, 'utf-8');

      if (filePath.endsWith('.csv')) {
        return this.parseCSV(content);
      } else if (filePath.endsWith('.md')) {
        return this.parseMarkdown(content);
      } else {
        throw new Error('不支持的文件格式，请使用 .csv 或 .md 文件');
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return []; // 文件不存在，返回空数组
      }
      throw error;
    }
  }

  static async writeFeatures(filePath: string, features: SimpleFeature[]): Promise<void> {
    const featuresTable: FeaturesTable = {
      features,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };

    let content: string;

    if (filePath.endsWith('.csv')) {
      content = this.generateCSV(features);
    } else if (filePath.endsWith('.md')) {
      content = this.generateMarkdown(features);
    } else {
      throw new Error('不支持的文件格式，请使用 .csv 或 .md 文件');
    }

    await writeFile(filePath, content, 'utf-8');
  }
}