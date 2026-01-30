import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readdirMock = vi.fn();
const readTeamFileMock = vi.fn();
const readFeatureFileMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
}));

vi.mock('../core/parser.js', () => ({
  readTeamFile: readTeamFileMock,
  readFeatureFile: readFeatureFileMock,
}));

vi.mock('cli-table3', () => ({
  default: class MockTable {
    push = vi.fn();
    toString = () => 'mock table';
  },
}));

const loadAnalyzeCommand = async () => {
  vi.resetModules();
  const module = await import('./analyze.js');
  return module.analyzeCommand;
};

describe('analyze command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    readdirMock.mockReset();
    readTeamFileMock.mockReset();
    readFeatureFileMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows workload summary', async () => {
    readdirMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['feat-001.md']);
    readTeamFileMock.mockResolvedValue({
      members: [
        { name: 'Alice', skills: ['TypeScript'], capacity: 40, currentLoad: 16 },
        { name: 'Bob', skills: ['React'], capacity: 40, currentLoad: 8 },
      ],
    });
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      assignee: 'Alice',
      estimate: 16,
      skillsRequired: ['TypeScript'],
    });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync([], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Workload Summary'))).toBe(true);
  });

  it('shows error when pmspace directory not found', async () => {
    readdirMock.mockRejectedValue({ code: 'ENOENT' });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('pmspec directory not found'))).toBe(true);
  });

  it('shows error when team.md not found', async () => {
    readdirMock.mockResolvedValue([]);
    readTeamFileMock.mockRejectedValue({ code: 'ENOENT' });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('team.md not found'))).toBe(true);
  });

  it('shows assignment recommendations with --recommend flag', async () => {
    readdirMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['feat-001.md']);
    readTeamFileMock.mockResolvedValue({
      members: [{ name: 'Alice', skills: ['TypeScript'], capacity: 40, currentLoad: 0 }],
    });
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Unassigned Feature',
      assignee: undefined,
      estimate: 16,
      skillsRequired: ['TypeScript'],
    });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync(['--recommend'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Assignment Recommendations'))).toBe(true);
  });

  it('shows skill analysis with --skills flag', async () => {
    readdirMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['feat-001.md']);
    readTeamFileMock.mockResolvedValue({
      members: [{ name: 'Alice', skills: ['TypeScript'], capacity: 40, currentLoad: 0 }],
    });
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Feature requiring Python',
      assignee: 'Alice',
      estimate: 16,
      skillsRequired: ['Python'],
    });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync(['--skills'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Skill Gap Analysis'))).toBe(true);
  });

  it('handles empty features list', async () => {
    readdirMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    readTeamFileMock.mockResolvedValue({
      members: [{ name: 'Alice', skills: ['TypeScript'], capacity: 40, currentLoad: 0 }],
    });

    const analyzeCommand = await loadAnalyzeCommand();
    analyzeCommand.exitOverride();

    await analyzeCommand.parseAsync([], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('No features found') || msg.includes('Workload Summary') || msg.includes('Warning'))).toBe(true);
  });
});
