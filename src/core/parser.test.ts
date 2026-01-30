import { describe, it, expect } from 'vitest';
import { parseEpic, parseFeature, parseProject, parseTeam, parseMetadata, parseMilestone } from './parser.js';

describe('parseMetadata', () => {
  it('should parse metadata fields', () => {
    const content = `
- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
`;
    const metadata = parseMetadata(content);
    expect(metadata['ID']).toBe('EPIC-001');
    expect(metadata['Status']).toBe('planning');
    expect(metadata['Owner']).toBe('Alice');
    expect(metadata['Estimate']).toBe('80 hours');
  });
});

describe('parseEpic', () => {
  it('should parse Epic from markdown', () => {
    const content = `# Epic: User Authentication

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
Build a complete authentication system.

## Features
- [ ] FEAT-001: Login form
- [ ] FEAT-002: Signup form
`;

    const epic = parseEpic(content);
    expect(epic.id).toBe('EPIC-001');
    expect(epic.title).toBe('User Authentication');
    expect(epic.status).toBe('planning');
    expect(epic.owner).toBe('Alice');
    expect(epic.estimate).toBe(80);
    expect(epic.actual).toBe(0);
    expect(epic.description).toContain('Build a complete authentication system');
    expect(epic.features).toEqual(['FEAT-001', 'FEAT-002']);
  });

  it('should handle Epic without features', () => {
    const content = `# Epic: Test Epic

- **ID**: EPIC-001
- **Status**: planning
- **Estimate**: 10 hours

## Description
Test description
`;

    const epic = parseEpic(content);
    expect(epic.features).toEqual([]);
  });
});

describe('parseFeature', () => {
  it('should parse Feature from markdown', () => {
    const content = `# Feature: Login Form

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Bob
- **Estimate**: 16 hours
- **Actual**: 0 hours
- **Skills Required**: React, TypeScript

## Description
Build a responsive login form.

## User Stories
- [ ] STORY-001: As a user, I want to enter credentials (4h)
- [ ] STORY-002: As a user, I want to see validation errors (2h)

## Acceptance Criteria
- [ ] Form validates email format
- [ ] Password is masked
`;

    const feature = parseFeature(content);
    expect(feature.id).toBe('FEAT-001');
    expect(feature.title).toBe('Login Form');
    expect(feature.epicId).toBe('EPIC-001');
    expect(feature.status).toBe('todo');
    expect(feature.assignee).toBe('Bob');
    expect(feature.estimate).toBe(16);
    expect(feature.actual).toBe(0);
    expect(feature.skillsRequired).toEqual(['React', 'TypeScript']);
    expect(feature.userStories).toHaveLength(2);
    expect(feature.userStories[0].id).toBe('STORY-001');
    expect(feature.userStories[0].estimate).toBe(4);
    expect(feature.acceptanceCriteria).toContain('Form validates email format');
  });

  it('should handle Feature without assignee', () => {
    const content = `# Feature: Test

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Estimate**: 8 hours
`;

    const feature = parseFeature(content);
    expect(feature.assignee).toBeUndefined();
  });
});

describe('parseProject', () => {
  it('should parse Project from markdown', () => {
    const content = `# Project: My Awesome Project

## Overview
This is a project overview.

## Timeline
- Start: 2025-01-01
- End: 2025-03-31

## Team Capacity
- Total: 160 person-weeks
- Available: 120 person-weeks
`;

    const project = parseProject(content);
    expect(project.name).toBe('My Awesome Project');
    expect(project.overview).toContain('This is a project overview');
    expect(project.timeline?.start).toBe('2025-01-01');
    expect(project.timeline?.end).toBe('2025-03-31');
    expect(project.teamCapacity?.total).toBe(160);
    expect(project.teamCapacity?.available).toBe(120);
  });
});

describe('parseTeam', () => {
  it('should parse Team from markdown', () => {
    const content = `# Team

## Members

### Alice
- **Skills**: React, TypeScript, Node.js
- **Capacity**: 40 hours/week
- **Current Load**: 20 hours/week

### Bob
- **Skills**: Python, Django
- **Capacity**: 30 hours/week
- **Current Load**: 15 hours/week
`;

    const team = parseTeam(content);
    expect(team.members).toHaveLength(2);

    const alice = team.members[0];
    expect(alice.name).toBe('Alice');
    expect(alice.skills).toEqual(['React', 'TypeScript', 'Node.js']);
    expect(alice.capacity).toBe(40);
    expect(alice.currentLoad).toBe(20);

    const bob = team.members[1];
    expect(bob.name).toBe('Bob');
    expect(bob.skills).toEqual(['Python', 'Django']);
    expect(bob.capacity).toBe(30);
    expect(bob.currentLoad).toBe(15);
  });

  it('should handle member without current load', () => {
    const content = `# Team

## Members

### Alice
- **Skills**: React
- **Capacity**: 40 hours/week
`;

    const team = parseTeam(content);
    expect(team.members[0].currentLoad).toBe(0);
  });
});

describe('parseMilestone', () => {
  it('should parse Milestone from markdown', () => {
    const content = `# Milestone: Q1 Release

- **ID**: MILE-001
- **Target Date**: 2024-03-31
- **Status**: active

## Description
First quarter release milestone.

## Features
- [ ] FEAT-001
- [ ] FEAT-002
- [x] FEAT-003
`;

    const milestone = parseMilestone(content);
    expect(milestone.id).toBe('MILE-001');
    expect(milestone.title).toBe('Q1 Release');
    expect(milestone.targetDate).toBe('2024-03-31');
    expect(milestone.status).toBe('active');
    expect(milestone.description).toContain('First quarter release milestone');
    expect(milestone.features).toEqual(['FEAT-001', 'FEAT-002', 'FEAT-003']);
  });

  it('should handle Milestone without features', () => {
    const content = `# Milestone: Empty Milestone

- **ID**: MILE-001
- **Target Date**: 2024-06-30
- **Status**: upcoming

## Description
A milestone with no features yet.
`;

    const milestone = parseMilestone(content);
    expect(milestone.id).toBe('MILE-001');
    expect(milestone.features).toEqual([]);
  });

  it('should handle Milestone without description', () => {
    const content = `# Milestone: Simple Milestone

- **ID**: MILE-002
- **Target Date**: 2024-12-31
- **Status**: completed

## Features
- [x] FEAT-001
`;

    const milestone = parseMilestone(content);
    expect(milestone.id).toBe('MILE-002');
    expect(milestone.status).toBe('completed');
    expect(milestone.description).toBeUndefined();
    expect(milestone.features).toEqual(['FEAT-001']);
  });
});
