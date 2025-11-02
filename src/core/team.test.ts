import { describe, it, expect } from 'vitest';
import {
  TeamMember,
  calculateSkillMatch,
  getMissingSkills,
  calculateLoadPercentage,
  isOverallocated,
  getAvailableHours,
} from './team.js';

describe('calculateSkillMatch', () => {
  it('should return 1.0 for perfect match', () => {
    const memberSkills = ['React', 'TypeScript'];
    const requiredSkills = ['React', 'TypeScript'];
    expect(calculateSkillMatch(memberSkills, requiredSkills)).toBe(1.0);
  });

  it('should return 1.0 when no skills required', () => {
    const memberSkills = ['React'];
    const requiredSkills: string[] = [];
    expect(calculateSkillMatch(memberSkills, requiredSkills)).toBe(1.0);
  });

  it('should calculate partial match', () => {
    const memberSkills = ['React', 'TypeScript'];
    const requiredSkills = ['React', 'GraphQL'];
    // Intersection: {React} = 1, Union: {React, TypeScript, GraphQL} = 3
    expect(calculateSkillMatch(memberSkills, requiredSkills)).toBeCloseTo(1 / 3);
  });

  it('should be case insensitive', () => {
    const memberSkills = ['react', 'TYPESCRIPT'];
    const requiredSkills = ['React', 'TypeScript'];
    expect(calculateSkillMatch(memberSkills, requiredSkills)).toBe(1.0);
  });
});

describe('getMissingSkills', () => {
  it('should return empty for complete match', () => {
    const memberSkills = ['React', 'TypeScript'];
    const requiredSkills = ['React'];
    expect(getMissingSkills(memberSkills, requiredSkills)).toEqual([]);
  });

  it('should return missing skills', () => {
    const memberSkills = ['React'];
    const requiredSkills = ['React', 'TypeScript', 'GraphQL'];
    expect(getMissingSkills(memberSkills, requiredSkills)).toEqual(['TypeScript', 'GraphQL']);
  });

  it('should be case insensitive', () => {
    const memberSkills = ['react'];
    const requiredSkills = ['React', 'TypeScript'];
    expect(getMissingSkills(memberSkills, requiredSkills)).toEqual(['TypeScript']);
  });
});

describe('calculateLoadPercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateLoadPercentage(20, 40)).toBe(50);
    expect(calculateLoadPercentage(40, 40)).toBe(100);
    expect(calculateLoadPercentage(60, 40)).toBe(150);
  });

  it('should return 0 for zero capacity', () => {
    expect(calculateLoadPercentage(10, 0)).toBe(0);
  });
});

describe('isOverallocated', () => {
  it('should detect overallocation', () => {
    const member: TeamMember = {
      name: 'Alice',
      skills: [],
      capacity: 40,
      currentLoad: 50,
    };
    expect(isOverallocated(member)).toBe(true);
  });

  it('should return false for normal load', () => {
    const member: TeamMember = {
      name: 'Alice',
      skills: [],
      capacity: 40,
      currentLoad: 30,
    };
    expect(isOverallocated(member)).toBe(false);
  });
});

describe('getAvailableHours', () => {
  it('should calculate available hours', () => {
    const member: TeamMember = {
      name: 'Alice',
      skills: [],
      capacity: 40,
      currentLoad: 20,
    };
    expect(getAvailableHours(member)).toBe(20);
  });

  it('should return 0 for overallocated member', () => {
    const member: TeamMember = {
      name: 'Alice',
      skills: [],
      capacity: 40,
      currentLoad: 50,
    };
    expect(getAvailableHours(member)).toBe(0);
  });
});
