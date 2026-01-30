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

const loadListCommand = async () => {
  vi.resetModules();
  const module = await import('./list.js');
  return module.listCommand;
};

describe('list command', () => {
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

  it('lists epics by default', async () => {
    readdirMock.mockResolvedValue(['epic-001.md', 'epic-002.md']);
    readEpicFileMock
      .mockResolvedValueOnce({
        id: 'EPIC-001',
        title: 'First Epic',
        status: 'planning',
        owner: 'Alice',
        estimate: 40,
        actual: 0,
        features: [],
      })
      .mockResolvedValueOnce({
        id: 'EPIC-002',
        title: 'Second Epic',
        status: 'in-progress',
        owner: 'Bob',
        estimate: 80,
        actual: 20,
        features: [],
      });

    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync([], { from: 'user' });

    expect(readEpicFileMock).toHaveBeenCalledTimes(2);
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Epics'))).toBe(true);
    expect(messages.some(msg => msg.includes('EPIC-001'))).toBe(true);
  });

  it('lists features when type is features', async () => {
    readdirMock.mockResolvedValue(['feat-001.md']);
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Feature One',
      epicId: 'EPIC-001',
      status: 'todo',
      assignee: 'Alice',
      estimate: 16,
      actual: 0,
      skillsRequired: [],
      userStories: [],
      acceptanceCriteria: [],
    });

    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync(['features'], { from: 'user' });

    expect(readFeatureFileMock).toHaveBeenCalledTimes(1);
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Features'))).toBe(true);
  });

  it('filters epics by status', async () => {
    readdirMock.mockResolvedValue(['epic-001.md', 'epic-002.md']);
    readEpicFileMock
      .mockResolvedValueOnce({
        id: 'EPIC-001',
        title: 'Planning Epic',
        status: 'planning',
        owner: 'Alice',
        estimate: 40,
        actual: 0,
        features: [],
      })
      .mockResolvedValueOnce({
        id: 'EPIC-002',
        title: 'Active Epic',
        status: 'in-progress',
        owner: 'Bob',
        estimate: 80,
        actual: 20,
        features: [],
      });

    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync(['epics', '--status', 'planning'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('EPIC-001'))).toBe(true);
    expect(messages.some(msg => msg.includes('Total: 1 Epic'))).toBe(true);
  });

  it('shows no epics message when directory is empty', async () => {
    readdirMock.mockResolvedValue([]);

    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync(['epics'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('No Epics found'))).toBe(true);
  });

  it('shows error for unknown type', async () => {
    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync(['unknown'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Unknown type'))).toBe(true);
  });

  it('filters features by assignee', async () => {
    readdirMock.mockResolvedValue(['feat-001.md', 'feat-002.md']);
    readFeatureFileMock
      .mockResolvedValueOnce({
        id: 'FEAT-001',
        title: 'Alice Feature',
        epicId: 'EPIC-001',
        status: 'todo',
        assignee: 'Alice',
        estimate: 16,
        actual: 0,
        skillsRequired: [],
        userStories: [],
        acceptanceCriteria: [],
      })
      .mockResolvedValueOnce({
        id: 'FEAT-002',
        title: 'Bob Feature',
        epicId: 'EPIC-001',
        status: 'todo',
        assignee: 'Bob',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
        userStories: [],
        acceptanceCriteria: [],
      });

    const listCommand = await loadListCommand();
    listCommand.exitOverride();

    await listCommand.parseAsync(['features', '--assignee', 'Alice'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('FEAT-001'))).toBe(true);
    expect(messages.some(msg => msg.includes('Total: 1 Feature'))).toBe(true);
  });
});
