import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readdirMock = vi.fn();
const mkdirMock = vi.fn();
const writeFileMock = vi.fn();
const readEpicFileMock = vi.fn();
const readFeatureFileMock = vi.fn();
const writeEpicFileMock = vi.fn();
const writeFeatureFileMock = vi.fn();
const generateNextIdMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
  mkdir: mkdirMock,
  writeFile: writeFileMock,
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
  EpicSchema: {
    parse: vi.fn((data) => data),
  },
  FeatureSchema: {
    parse: vi.fn((data) => data),
  },
  UserStorySchema: {
    parse: vi.fn((data) => data),
  },
  generateNextId: generateNextIdMock,
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const loadCreateCommand = async () => {
  vi.resetModules();
  const module = await import('./create.js');
  return module.createCommand;
};

describe('create command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    readdirMock.mockReset();
    mkdirMock.mockReset();
    writeFileMock.mockReset();
    readEpicFileMock.mockReset();
    readFeatureFileMock.mockReset();
    writeEpicFileMock.mockReset();
    writeFeatureFileMock.mockReset();
    generateNextIdMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates epic in non-interactive mode', async () => {
    readdirMock.mockResolvedValue([]);
    generateNextIdMock.mockReturnValue('EPIC-001');
    writeEpicFileMock.mockResolvedValue(undefined);

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['epic', '--non-interactive'], { from: 'user' });

    expect(writeEpicFileMock).toHaveBeenCalledWith(
      expect.stringContaining('epic-001.md'),
      expect.objectContaining({
        id: 'EPIC-001',
        title: 'New Epic',
        status: 'planning',
      })
    );
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Created Epic'))).toBe(true);
  });

  it('creates feature in non-interactive mode with epic ID', async () => {
    readdirMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      features: [],
    });
    generateNextIdMock.mockReturnValue('FEAT-001');
    writeFeatureFileMock.mockResolvedValue(undefined);

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['feature', '--epic', 'EPIC-001', '--non-interactive'], { from: 'user' });

    expect(writeFeatureFileMock).toHaveBeenCalledWith(
      expect.stringContaining('feat-001.md'),
      expect.objectContaining({
        id: 'FEAT-001',
        title: 'New Feature',
        epicId: 'EPIC-001',
        status: 'todo',
      })
    );
  });

  it('shows error for invalid type', async () => {
    readdirMock.mockResolvedValue([]);

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['invalid'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Type must be'))).toBe(true);
  });

  it('shows error when pmspace directory not found', async () => {
    readdirMock.mockRejectedValue({ code: 'ENOENT' });

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['epic', '--non-interactive'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('pmspec directory not found'))).toBe(true);
  });

  it('shows error when creating feature without epic ID in non-interactive mode', async () => {
    readdirMock.mockResolvedValue([]);

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['feature', '--non-interactive'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Epic ID is required'))).toBe(true);
  });

  it('shows error when epic not found for feature creation', async () => {
    readdirMock.mockResolvedValue([]);
    readEpicFileMock.mockRejectedValue({ code: 'ENOENT' });

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['feature', '--epic', 'EPIC-999', '--non-interactive'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('not found'))).toBe(true);
  });

  it('creates story in non-interactive mode', async () => {
    readdirMock.mockResolvedValue(['feat-001.md']);
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      userStories: [],
    });
    generateNextIdMock.mockReturnValue('STORY-001');
    writeFeatureFileMock.mockResolvedValue(undefined);

    const createCommand = await loadCreateCommand();
    createCommand.exitOverride();

    await createCommand.parseAsync(['story', '--feature', 'FEAT-001', '--non-interactive'], { from: 'user' });

    expect(writeFeatureFileMock).toHaveBeenCalled();
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('Created User Story'))).toBe(true);
  });
});
