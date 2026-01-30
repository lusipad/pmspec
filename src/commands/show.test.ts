import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readdirMock = vi.fn();
const readEpicFileMock = vi.fn();
const readFeatureFileMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
}));

vi.mock('../core/parser.js', () => ({
  readEpicFile: readEpicFileMock,
  readFeatureFile: readFeatureFileMock,
}));

const loadShowCommand = async () => {
  vi.resetModules();
  const module = await import('./show.js');
  return module.showCommand;
};

describe('show command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    readdirMock.mockReset();
    readEpicFileMock.mockReset();
    readFeatureFileMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows epic details', async () => {
    readdirMock.mockResolvedValue([]);
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      owner: 'Alice',
      estimate: 40,
      actual: 10,
      description: 'Epic description here',
      features: [],
    });

    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    await showCommand.parseAsync(['EPIC-001'], { from: 'user' });

    expect(readEpicFileMock).toHaveBeenCalledWith(expect.stringContaining('epic-001.md'));
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Test Epic'))).toBe(true);
    expect(messages.some(msg => msg.includes('EPIC-001'))).toBe(true);
  });

  it('shows feature details', async () => {
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      assignee: 'Bob',
      estimate: 16,
      actual: 0,
      skillsRequired: ['TypeScript', 'React'],
      description: 'Feature description',
      userStories: [],
      acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    });

    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    await showCommand.parseAsync(['FEAT-001'], { from: 'user' });

    expect(readFeatureFileMock).toHaveBeenCalledWith(expect.stringContaining('feat-001.md'));
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Test Feature'))).toBe(true);
    expect(messages.some(msg => msg.includes('FEAT-001'))).toBe(true);
  });

  it('shows epic with features list', async () => {
    readdirMock.mockResolvedValue(['feat-001.md', 'feat-002.md']);
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Epic with Features',
      status: 'in-progress',
      owner: 'Alice',
      estimate: 80,
      actual: 20,
      description: 'An epic with multiple features',
      features: ['FEAT-001', 'FEAT-002'],
    });
    readFeatureFileMock
      .mockResolvedValueOnce({
        id: 'FEAT-001',
        title: 'First Feature',
        status: 'done',
        estimate: 16,
      })
      .mockResolvedValueOnce({
        id: 'FEAT-002',
        title: 'Second Feature',
        status: 'todo',
        estimate: 24,
      });

    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    await showCommand.parseAsync(['EPIC-001'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Features'))).toBe(true);
    expect(messages.some(msg => msg.includes('Progress'))).toBe(true);
  });

  it('shows feature with user stories', async () => {
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Feature with Stories',
      epicId: 'EPIC-001',
      status: 'in-progress',
      assignee: 'Charlie',
      estimate: 24,
      actual: 8,
      skillsRequired: [],
      description: 'A feature with user stories',
      userStories: [
        { id: 'STORY-001', title: 'First Story', estimate: 8, status: 'done', featureId: 'FEAT-001' },
        { id: 'STORY-002', title: 'Second Story', estimate: 8, status: 'todo', featureId: 'FEAT-001' },
      ],
      acceptanceCriteria: [],
    });

    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    await showCommand.parseAsync(['FEAT-001'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('User Stories'))).toBe(true);
    expect(messages.some(msg => msg.includes('STORY-001'))).toBe(true);
  });

  it('handles invalid ID format', async () => {
    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    await showCommand.parseAsync(['INVALID-001'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Invalid ID format'))).toBe(true);
  });

  it('handles not found epic', async () => {
    const error = new Error('Not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    readEpicFileMock.mockRejectedValue(error);

    const showCommand = await loadShowCommand();
    showCommand.exitOverride();

    try {
      await showCommand.parseAsync(['EPIC-999'], { from: 'user' });
    } catch {
      // exitOverride throws on process.exit
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('not found'))).toBe(true);
  });
});
