import { describe, it, expect } from 'vitest';
import { generateEpicMarkdown, generateFeatureMarkdown, generateProjectMarkdown, generateTeamMarkdown } from './markdown.js';
import { parseEpic, parseFeature, parseProject, parseTeam } from '../core/parser.js';
import type { Epic, Feature, Project, Team } from '../core/index.js';

describe('generateEpicMarkdown', () => {
  it('should generate valid Epic markdown', () => {
    const epic: Epic = {
      id: 'EPIC-001',
      title: 'User Authentication',
      status: 'planning',
      owner: 'Alice',
      estimate: 80,
      actual: 0,
      description: 'Build authentication system',
      features: ['FEAT-001', 'FEAT-002'],
    };

    const markdown = generateEpicMarkdown(epic);
    expect(markdown).toContain('# Epic: User Authentication');
    expect(markdown).toContain('- **ID**: EPIC-001');
    expect(markdown).toContain('- **Status**: planning');
    expect(markdown).toContain('- **Owner**: Alice');
    expect(markdown).toContain('## Description');
    expect(markdown).toContain('Build authentication system');
    expect(markdown).toContain('## Features');
    expect(markdown).toContain('FEAT-001');
  });

  it('should handle Epic without optional fields', () => {
    const epic: Epic = {
      id: 'EPIC-001',
      title: 'Test',
      status: 'planning',
      estimate: 10,
      actual: 0,
      features: [],
    };

    const markdown = generateEpicMarkdown(epic);
    expect(markdown).not.toContain('**Owner**');
    expect(markdown).not.toContain('## Description');
    expect(markdown).not.toContain('## Features');
  });
});

describe('generateFeatureMarkdown', () => {
  it('should generate valid Feature markdown', () => {
    const feature: Feature = {
      id: 'FEAT-001',
      title: 'Login Form',
      epicId: 'EPIC-001',
      status: 'todo',
      assignee: 'Bob',
      estimate: 16,
      actual: 0,
      skillsRequired: ['React', 'TypeScript'],
      description: 'Build login form',
      userStories: [
        {
          id: 'STORY-001',
          title: 'User can enter credentials',
          estimate: 4,
          status: 'todo',
          featureId: 'FEAT-001',
        },
      ],
      acceptanceCriteria: ['Email validation works'],
    };

    const markdown = generateFeatureMarkdown(feature);
    expect(markdown).toContain('# Feature: Login Form');
    expect(markdown).toContain('- **Assignee**: Bob');
    expect(markdown).toContain('- **Skills Required**: React, TypeScript');
    expect(markdown).toContain('## User Stories');
    expect(markdown).toContain('STORY-001');
    expect(markdown).toContain('## Acceptance Criteria');
  });
});

describe('Round-trip consistency', () => {
  it('should maintain Epic data through parse→generate→parse cycle', () => {
    const original: Epic = {
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      owner: 'Alice',
      estimate: 80,
      actual: 10,
      description: 'Test description',
      features: ['FEAT-001'],
    };

    const markdown = generateEpicMarkdown(original);
    const parsed = parseEpic(markdown);

    expect(parsed.id).toBe(original.id);
    expect(parsed.title).toBe(original.title);
    expect(parsed.status).toBe(original.status);
    expect(parsed.owner).toBe(original.owner);
    expect(parsed.estimate).toBe(original.estimate);
    expect(parsed.actual).toBe(original.actual);
  });

  it('should maintain Feature data through parse→generate→parse cycle', () => {
    const original: Feature = {
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: ['React'],
      userStories: [],
      acceptanceCriteria: [],
    };

    const markdown = generateFeatureMarkdown(original);
    const parsed = parseFeature(markdown);

    expect(parsed.id).toBe(original.id);
    expect(parsed.title).toBe(original.title);
    expect(parsed.epicId).toBe(original.epicId);
    expect(parsed.status).toBe(original.status);
    expect(parsed.estimate).toBe(original.estimate);
  });
});
