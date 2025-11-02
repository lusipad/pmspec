import { describe, it, expect, beforeEach, vi } from 'vitest';

const readdirMock = vi.fn();
const readFileMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
  readFile: readFileMock,
}));

const loadService = async () => {
  vi.resetModules();
  return import('./dataService.js');
};

describe('dataService helpers', () => {
  beforeEach(() => {
    readdirMock.mockReset();
    readFileMock.mockReset();
  });

  it('returns sorted epics with parsed metadata', async () => {
    readdirMock.mockResolvedValue(['epic-2.md', 'epic-1.md']);

    const epic1Content = `# Epic: Discovery

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 100
- **Actual**: 10

## Description
Understand the problem space.

## Features
- [ ] FEAT-001
- [x] FEAT-002
`;

    const epic2Content = `# Epic: Delivery

- **ID**: EPIC-002
- **Status**: in-progress
- **Owner**: Bob
- **Estimate**: 120
- **Actual**: 40

## Description
Ship core capabilities.

## Features
- [ ] FEAT-003
- [ ] FEAT-004
`;

    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('epic-1.md')) return epic1Content;
      if (filePath.endsWith('epic-2.md')) return epic2Content;
      throw new Error(`Unexpected file ${filePath}`);
    });

    const { getEpics } = await loadService();
    const epics = await getEpics();

    expect(epics.map((epic) => epic.id)).toEqual(['EPIC-001', 'EPIC-002']);
    expect(epics[0].features).toEqual(['FEAT-001', 'FEAT-002']);
    expect(epics[1].status).toBe('in-progress');
  });

  it('parses features including required skills', async () => {
    readdirMock.mockResolvedValue(['feat-1.md']);

    const featureContent = `# Feature: Authentication

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Carol
- **Estimate**: 16
- **Actual**: 4
- **Skills Required**: React, Node.js

## Description
Implement user login.
`;

    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('feat-1.md')) return featureContent;
      throw new Error(`Unexpected file ${filePath}`);
    });

    const { getFeatures } = await loadService();
    const features = await getFeatures();

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: 'FEAT-001',
      epic: 'EPIC-001',
      assignee: 'Carol',
      skillsRequired: ['React', 'Node.js'],
    });
  });

  it('parses team members with capacity and load', async () => {
    const teamContent = `# Team

## Members

### Alice
- **Skills**: React, TypeScript
- **Capacity**: 40 hours/week
- **Current Load**: 18 hours/week

### Bob
- **Skills**: Node.js
- **Capacity**: 35 hours/week
- **Current Load**: 10 hours/week
`;

    readFileMock.mockResolvedValue(teamContent);

    const { getTeam } = await loadService();
    const team = await getTeam();

    expect(team.members).toHaveLength(2);
    expect(team.members[0]).toMatchObject({
      name: 'Alice',
      skills: ['React', 'TypeScript'],
      capacity: 40,
      currentLoad: 18,
    });
    expect(team.members[1]).toMatchObject({
      name: 'Bob',
      skills: ['Node.js'],
      capacity: 35,
      currentLoad: 10,
    });
  });
});
