import { describe, it, expect } from 'vitest';
import {
  JiraImporter,
  LinearImporter,
  GitHubImporter,
  getImporter,
  getAllImporters,
  isValidSource,
} from './importers.js';

describe('Importers Module', () => {
  describe('getImporter', () => {
    it('should return Jira importer for jira source', () => {
      const importer = getImporter('jira');
      expect(importer.name).toBe('Jira Importer');
      expect(importer.source).toBe('jira');
    });

    it('should return Linear importer for linear source', () => {
      const importer = getImporter('linear');
      expect(importer.name).toBe('Linear Importer');
      expect(importer.source).toBe('linear');
    });

    it('should return GitHub importer for github source', () => {
      const importer = getImporter('github');
      expect(importer.name).toBe('GitHub Issues Importer');
      expect(importer.source).toBe('github');
    });

    it('should throw for unknown source', () => {
      expect(() => getImporter('unknown' as any)).toThrow('Unknown import source');
    });
  });

  describe('getAllImporters', () => {
    it('should return all 3 importers', () => {
      const importers = getAllImporters();
      expect(importers).toHaveLength(3);
      expect(importers.map(i => i.source)).toEqual(['jira', 'linear', 'github']);
    });
  });

  describe('isValidSource', () => {
    it('should return true for valid sources', () => {
      expect(isValidSource('jira')).toBe(true);
      expect(isValidSource('linear')).toBe(true);
      expect(isValidSource('github')).toBe(true);
    });

    it('should return false for invalid sources', () => {
      expect(isValidSource('unknown')).toBe(false);
      expect(isValidSource('')).toBe(false);
    });
  });
});

describe('JiraImporter', () => {
  const importer = new JiraImporter();

  describe('validate', () => {
    it('should validate correct Jira export format', async () => {
      const validExport = JSON.stringify({
        issues: [
          {
            key: 'PROJ-1',
            fields: {
              summary: 'Test Issue',
              issuetype: { name: 'Story' },
              status: { name: 'To Do' },
              labels: [],
            },
          },
        ],
      });

      const result = await importer.validate(validExport);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid JSON', async () => {
      const result = await importer.validate('not json');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty issues array', async () => {
      const result = await importer.validate(JSON.stringify({ issues: [] }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No issues found in export');
    });

    it('should reject invalid format', async () => {
      const result = await importer.validate(JSON.stringify({ notIssues: [] }));
      expect(result.valid).toBe(false);
    });
  });

  describe('import', () => {
    it('should import Jira issues as features', async () => {
      const jiraExport = {
        issues: [
          {
            key: 'PROJ-1',
            fields: {
              summary: 'User Authentication',
              description: 'Implement user login',
              issuetype: { name: 'Story' },
              status: { name: 'To Do' },
              priority: { name: 'High' },
              assignee: { displayName: 'Alice' },
              labels: ['frontend'],
              timeoriginalestimate: 28800, // 8 hours in seconds
              created: '2024-01-01T00:00:00Z',
            },
          },
          {
            key: 'PROJ-2',
            fields: {
              summary: 'Authentication Epic',
              issuetype: { name: 'Epic' },
              status: { name: 'In Progress' },
              labels: [],
            },
          },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(jiraExport),
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.features).toHaveLength(1);
      expect(result.epics).toHaveLength(1);
      
      const feature = result.features[0];
      expect(feature.name).toBe('User Authentication');
      expect(feature.priority).toBe('high');
      expect(feature.status).toBe('todo');
      expect(feature.assignee).toBe('Alice');
      expect(feature.estimate).toBe(8);
      expect(feature.tags).toContain('jira:PROJ-1');
    });

    it('should map Epic to category', async () => {
      const jiraExport = {
        issues: [
          {
            key: 'EPIC-1',
            fields: {
              summary: 'Authentication',
              issuetype: { name: 'Epic' },
              status: { name: 'In Progress' },
              labels: [],
            },
          },
          {
            key: 'STORY-1',
            fields: {
              summary: 'Login Form',
              issuetype: { name: 'Story' },
              status: { name: 'To Do' },
              labels: [],
              parent: {
                key: 'EPIC-1',
                fields: {
                  summary: 'Authentication',
                  issuetype: { name: 'Epic' },
                },
              },
            },
          },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(jiraExport),
        dryRun: true,
      });

      expect(result.features[0].category).toBe('Authentication');
    });
  });
});

describe('LinearImporter', () => {
  const importer = new LinearImporter();

  describe('validate', () => {
    it('should validate correct Linear export format', async () => {
      const validExport = JSON.stringify({
        issues: [
          {
            id: 'issue-1',
            identifier: 'LIN-1',
            title: 'Test Issue',
            state: { name: 'Todo', type: 'unstarted' },
            priority: 2,
            priorityLabel: 'High',
          },
        ],
      });

      const result = await importer.validate(validExport);
      expect(result.valid).toBe(true);
    });
  });

  describe('import', () => {
    it('should import Linear issues as features', async () => {
      const linearExport = {
        issues: [
          {
            id: 'issue-1',
            identifier: 'LIN-1',
            title: 'API Integration',
            description: 'Connect to external API',
            state: { name: 'In Progress', type: 'started' },
            priority: 2,
            priorityLabel: 'High',
            estimate: 3, // story points
            assignee: { name: 'Bob' },
            labels: { nodes: [{ name: 'backend' }] },
            project: {
              id: 'proj-1',
              name: 'Backend Services',
              description: 'Core backend',
            },
          },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(linearExport),
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.features).toHaveLength(1);
      expect(result.epics).toHaveLength(1);
      
      const feature = result.features[0];
      expect(feature.name).toBe('API Integration');
      expect(feature.priority).toBe('high');
      expect(feature.status).toBe('in-progress');
      expect(feature.estimate).toBe(12); // 3 points * 4 hours
      expect(feature.category).toBe('Backend Services');
      expect(feature.tags).toContain('linear:LIN-1');
    });

    it('should map Linear priority correctly', async () => {
      const linearExport = {
        issues: [
          { id: '1', identifier: 'L-1', title: 'Urgent', state: { name: 'Todo', type: 'unstarted' }, priority: 1, priorityLabel: 'Urgent' },
          { id: '2', identifier: 'L-2', title: 'High', state: { name: 'Todo', type: 'unstarted' }, priority: 2, priorityLabel: 'High' },
          { id: '3', identifier: 'L-3', title: 'Medium', state: { name: 'Todo', type: 'unstarted' }, priority: 3, priorityLabel: 'Medium' },
          { id: '4', identifier: 'L-4', title: 'Low', state: { name: 'Todo', type: 'unstarted' }, priority: 4, priorityLabel: 'Low' },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(linearExport),
        dryRun: true,
      });

      expect(result.features[0].priority).toBe('critical');
      expect(result.features[1].priority).toBe('high');
      expect(result.features[2].priority).toBe('medium');
      expect(result.features[3].priority).toBe('low');
    });
  });
});

describe('GitHubImporter', () => {
  const importer = new GitHubImporter();

  describe('validate', () => {
    it('should validate correct GitHub export format', async () => {
      const validExport = JSON.stringify({
        issues: [
          {
            number: 1,
            title: 'Test Issue',
            state: 'open',
            labels: [],
          },
        ],
      });

      const result = await importer.validate(validExport);
      expect(result.valid).toBe(true);
    });

    it('should accept array format (direct from GitHub CLI)', async () => {
      const arrayExport = JSON.stringify([
        { number: 1, title: 'Issue 1', state: 'open', labels: [] },
        { number: 2, title: 'Issue 2', state: 'closed', labels: [] },
      ]);

      const result = await importer.validate(arrayExport);
      expect(result.valid).toBe(true);
    });
  });

  describe('import', () => {
    it('should import GitHub issues as features', async () => {
      const githubExport = {
        issues: [
          {
            number: 42,
            title: 'Bug fix for login',
            body: 'Fix the login timeout issue',
            state: 'open',
            labels: [
              { name: 'bug' },
              { name: 'priority:high' },
              { name: 'skill:typescript' },
            ],
            assignee: { login: 'charlie' },
            milestone: {
              number: 1,
              title: 'v1.0',
              description: 'First release',
              due_on: '2024-03-01T00:00:00Z',
            },
          },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(githubExport),
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.features).toHaveLength(1);
      expect(result.milestones).toHaveLength(1);
      
      const feature = result.features[0];
      expect(feature.name).toBe('Bug fix for login');
      expect(feature.priority).toBe('high');
      expect(feature.status).toBe('todo');
      expect(feature.assignee).toBe('charlie');
      expect(feature.tags).toContain('typescript'); // skill extracted
      expect(feature.tags).toContain('bug'); // other label preserved
      expect(feature.tags).toContain('github:#42');
      expect(feature.tags).toContain('milestone:v1.0');
    });

    it('should extract category from epic/category labels', async () => {
      const githubExport = {
        issues: [
          {
            number: 1,
            title: 'Feature 1',
            state: 'open',
            labels: [{ name: 'epic:Authentication' }],
          },
          {
            number: 2,
            title: 'Feature 2',
            state: 'open',
            labels: [{ name: 'category:Backend' }],
          },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(githubExport),
        dryRun: true,
      });

      expect(result.features[0].category).toBe('Authentication');
      expect(result.features[1].category).toBe('Backend');
      expect(result.epics).toHaveLength(2);
    });

    it('should extract estimate from size labels', async () => {
      const githubExport = {
        issues: [
          { number: 1, title: 'XS task', state: 'open', labels: [{ name: 'xs' }] },
          { number: 2, title: 'S task', state: 'open', labels: [{ name: 's' }] },
          { number: 3, title: 'M task', state: 'open', labels: [{ name: 'm' }] },
          { number: 4, title: 'L task', state: 'open', labels: [{ name: 'l' }] },
          { number: 5, title: 'XL task', state: 'open', labels: [{ name: 'xl' }] },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(githubExport),
        dryRun: true,
      });

      expect(result.features[0].estimate).toBe(2);  // XS
      expect(result.features[1].estimate).toBe(4);  // S
      expect(result.features[2].estimate).toBe(8);  // M
      expect(result.features[3].estimate).toBe(16); // L
      expect(result.features[4].estimate).toBe(32); // XL
    });

    it('should map closed issues to done status', async () => {
      const githubExport = {
        issues: [
          { number: 1, title: 'Open issue', state: 'open', labels: [] },
          { number: 2, title: 'Closed issue', state: 'closed', labels: [] },
        ],
      };

      const result = await importer.import({
        content: JSON.stringify(githubExport),
        dryRun: true,
      });

      expect(result.features[0].status).toBe('todo');
      expect(result.features[1].status).toBe('done');
    });
  });
});
