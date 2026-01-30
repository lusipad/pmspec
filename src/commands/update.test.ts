import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readdirMock = vi.fn();
const readEpicFileMock = vi.fn();
const readFeatureFileMock = vi.fn();
const writeEpicFileMock = vi.fn();
const writeFeatureFileMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
}));

vi.mock('../core/parser.js', () => ({
  readEpicFile: readEpicFileMock,
  readFeatureFile: readFeatureFileMock,
}));

vi.mock('../utils/markdown.js', () => ({
  writeEpicFile: writeEpicFileMock,
  writeFeatureFile: writeFeatureFileMock,
}));

vi.mock('../core/project.js', () => ({
  EpicStatus: { options: ['planning', 'in-progress', 'completed'] },
  FeatureStatus: { options: ['todo', 'in-progress', 'done'] },
  StoryStatus: { options: ['todo', 'in-progress', 'done'] },
}));

const loadUpdateCommand = async () => {
  vi.resetModules();
  const module = await import('./update.js');
  return module.updateCommand;
};

describe('update command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    readdirMock.mockReset();
    readEpicFileMock.mockReset();
    readFeatureFileMock.mockReset();
    writeEpicFileMock.mockReset();
    writeFeatureFileMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates epic status', async () => {
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: [],
    });
    writeEpicFileMock.mockResolvedValue(undefined);

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['EPIC-001', '--status', 'in-progress'], { from: 'user' });

    expect(writeEpicFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'in-progress' })
    );
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Updated') && msg.includes('status'))).toBe(true);
  });

  it('updates epic actual hours', async () => {
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'in-progress',
      estimate: 40,
      actual: 0,
      features: [],
    });
    writeEpicFileMock.mockResolvedValue(undefined);

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['EPIC-001', '--actual', '20'], { from: 'user' });

    expect(writeEpicFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ actual: 20 })
    );
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('actual hours'))).toBe(true);
  });

  it('updates feature status', async () => {
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: [],
    });
    writeFeatureFileMock.mockResolvedValue(undefined);

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['FEAT-001', '--status', 'done'], { from: 'user' });

    expect(writeFeatureFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'done' })
    );
  });

  it('updates feature assignee', async () => {
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      assignee: undefined,
      skillsRequired: [],
    });
    writeFeatureFileMock.mockResolvedValue(undefined);

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['FEAT-001', '--assignee', 'Alice'], { from: 'user' });

    expect(writeFeatureFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ assignee: 'Alice' })
    );
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('assignee'))).toBe(true);
  });

  it('shows error for invalid ID format', async () => {
    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['INVALID-001', '--status', 'done'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Invalid ID format'))).toBe(true);
  });

  it('shows error for invalid epic status', async () => {
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: [],
    });

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['EPIC-001', '--status', 'invalid-status'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Invalid status'))).toBe(true);
  });

  it('shows warning when no changes specified', async () => {
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: [],
    });

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['EPIC-001'], { from: 'user' });

    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('No changes specified'))).toBe(true);
  });

  it('handles not found epic', async () => {
    readEpicFileMock.mockRejectedValue({ code: 'ENOENT' });

    const updateCommand = await loadUpdateCommand();
    updateCommand.exitOverride();

    await updateCommand.parseAsync(['EPIC-999', '--status', 'in-progress'], { from: 'user' });

    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('not found'))).toBe(true);
  });
});
