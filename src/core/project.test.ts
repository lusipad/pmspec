import { describe, it, expect } from 'vitest';
import {
  Epic,
  Feature,
  UserStory,
  parseIdNumber,
  generateNextId,
  validateReferences,
  checkDuplicateIds,
  EpicSchema,
  FeatureSchema,
  UserStorySchema,
} from './project.js';

describe('project schemas', () => {
  it('should validate Epic schema', () => {
    const validEpic: Epic = {
      id: 'EPIC-001',
      title: 'User Authentication',
      status: 'planning',
      estimate: 80,
      actual: 0,
      features: [],
    };

    expect(() => EpicSchema.parse(validEpic)).not.toThrow();
  });

  it('should reject invalid Epic ID', () => {
    const invalidEpic = {
      id: 'INVALID-001',
      title: 'Test',
      status: 'planning',
      estimate: 10,
    };

    expect(() => EpicSchema.parse(invalidEpic)).toThrow();
  });

  it('should validate Feature schema', () => {
    const validFeature: Feature = {
      id: 'FEAT-001',
      title: 'Login form',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: ['React', 'TypeScript'],
      userStories: [],
      acceptanceCriteria: [],
    };

    expect(() => FeatureSchema.parse(validFeature)).not.toThrow();
  });

  it('should validate UserStory schema', () => {
    const validStory: UserStory = {
      id: 'STORY-001',
      title: 'As a user, I want to login',
      estimate: 4,
      status: 'todo',
      featureId: 'FEAT-001',
    };

    expect(() => UserStorySchema.parse(validStory)).not.toThrow();
  });
});

describe('parseIdNumber', () => {
  it('should parse Epic ID', () => {
    expect(parseIdNumber('EPIC-001')).toBe(1);
    expect(parseIdNumber('EPIC-042')).toBe(42);
  });

  it('should parse Feature ID', () => {
    expect(parseIdNumber('FEAT-123')).toBe(123);
  });

  it('should throw on invalid ID', () => {
    expect(() => parseIdNumber('INVALID')).toThrow();
  });
});

describe('generateNextId', () => {
  it('should generate first ID', () => {
    expect(generateNextId('EPIC', [])).toBe('EPIC-001');
  });

  it('should generate next ID', () => {
    expect(generateNextId('EPIC', ['EPIC-001', 'EPIC-002'])).toBe('EPIC-003');
  });

  it('should handle non-sequential IDs', () => {
    expect(generateNextId('FEAT', ['FEAT-001', 'FEAT-005'])).toBe('FEAT-006');
  });

  it('should pad with zeros', () => {
    expect(generateNextId('STORY', ['STORY-099'])).toBe('STORY-100');
  });
});

describe('validateReferences', () => {
  it('should validate correct references', () => {
    const epics: Epic[] = [
      { id: 'EPIC-001', title: 'Test', status: 'planning', estimate: 10, features: ['FEAT-001'] },
    ];
    const features: Feature[] = [
      {
        id: 'FEAT-001',
        title: 'Test Feature',
        epicId: 'EPIC-001',
        status: 'todo',
        estimate: 5,
        actual: 0,
        userStories: [],
        acceptanceCriteria: [],
        skillsRequired: [],
      },
    ];

    const result = validateReferences(epics, features);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect Feature referencing non-existent Epic', () => {
    const epics: Epic[] = [];
    const features: Feature[] = [
      {
        id: 'FEAT-001',
        title: 'Test',
        epicId: 'EPIC-999',
        status: 'todo',
        estimate: 5,
        actual: 0,
        userStories: [],
        acceptanceCriteria: [],
        skillsRequired: [],
      },
    ];

    const result = validateReferences(epics, features);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Feature FEAT-001 references non-existent Epic EPIC-999');
  });

  it('should detect Epic referencing non-existent Feature', () => {
    const epics: Epic[] = [
      { id: 'EPIC-001', title: 'Test', status: 'planning', estimate: 10, features: ['FEAT-999'] },
    ];
    const features: Feature[] = [];

    const result = validateReferences(epics, features);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Epic EPIC-001 references non-existent Feature FEAT-999');
  });
});

describe('checkDuplicateIds', () => {
  it('should pass with unique IDs', () => {
    const epics: Epic[] = [
      { id: 'EPIC-001', title: 'Test', status: 'planning', estimate: 10, features: [] },
    ];
    const features: Feature[] = [
      {
        id: 'FEAT-001',
        title: 'Test',
        epicId: 'EPIC-001',
        status: 'todo',
        estimate: 5,
        actual: 0,
        userStories: [],
        acceptanceCriteria: [],
        skillsRequired: [],
      },
    ];

    const result = checkDuplicateIds(epics, features);
    expect(result.valid).toBe(true);
  });

  it('should detect duplicate Epic IDs', () => {
    const epics: Epic[] = [
      { id: 'EPIC-001', title: 'Test 1', status: 'planning', estimate: 10, features: [] },
      { id: 'EPIC-001', title: 'Test 2', status: 'planning', estimate: 20, features: [] },
    ];
    const features: Feature[] = [];

    const result = checkDuplicateIds(epics, features);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duplicate ID found: EPIC-001');
  });
});
