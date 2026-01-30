import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mkdirMock = vi.fn();
const accessMock = vi.fn();
const writeProjectFileMock = vi.fn();
const writeTeamFileMock = vi.fn();

vi.mock('fs/promises', () => ({
  mkdir: mkdirMock,
  access: accessMock,
  constants: { F_OK: 0 },
}));

vi.mock('../utils/markdown.js', () => ({
  writeProjectFile: writeProjectFileMock,
  writeTeamFile: writeTeamFileMock,
}));

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

const loadInitCommand = async () => {
  vi.resetModules();
  const module = await import('./init.js');
  return module.initCommand;
};

describe('init command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    mkdirMock.mockReset();
    accessMock.mockReset();
    writeProjectFileMock.mockReset();
    writeTeamFileMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates pmspace directory structure when not exists', async () => {
    accessMock.mockRejectedValue({ code: 'ENOENT' });
    mkdirMock.mockResolvedValue(undefined);
    writeProjectFileMock.mockResolvedValue(undefined);
    writeTeamFileMock.mockResolvedValue(undefined);

    const initCommand = await loadInitCommand();
    initCommand.exitOverride();

    await initCommand.parseAsync([], { from: 'user' });

    expect(mkdirMock).toHaveBeenCalledTimes(2);
    expect(writeProjectFileMock).toHaveBeenCalledTimes(1);
    expect(writeTeamFileMock).toHaveBeenCalledTimes(1);
  });

  it('fails when pmspace already exists without --force', async () => {
    accessMock.mockResolvedValue(undefined);

    const initCommand = await loadInitCommand();
    initCommand.exitOverride();

    await initCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('already exists'))).toBe(true);
  });

  it('reinitializes with --force option', async () => {
    accessMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    writeProjectFileMock.mockResolvedValue(undefined);
    writeTeamFileMock.mockResolvedValue(undefined);

    const initCommand = await loadInitCommand();
    initCommand.exitOverride();

    await initCommand.parseAsync(['--force'], { from: 'user' });

    expect(mkdirMock).toHaveBeenCalled();
    expect(writeProjectFileMock).toHaveBeenCalled();
    expect(writeTeamFileMock).toHaveBeenCalled();
  });

  it('creates project.md with correct structure', async () => {
    accessMock.mockRejectedValue({ code: 'ENOENT' });
    mkdirMock.mockResolvedValue(undefined);
    writeProjectFileMock.mockResolvedValue(undefined);
    writeTeamFileMock.mockResolvedValue(undefined);

    const initCommand = await loadInitCommand();
    initCommand.exitOverride();

    await initCommand.parseAsync([], { from: 'user' });

    expect(writeProjectFileMock).toHaveBeenCalledWith(
      expect.stringContaining('project.md'),
      expect.objectContaining({
        name: 'My Project',
        overview: expect.any(String),
      })
    );
  });

  it('creates team.md with empty members', async () => {
    accessMock.mockRejectedValue({ code: 'ENOENT' });
    mkdirMock.mockResolvedValue(undefined);
    writeProjectFileMock.mockResolvedValue(undefined);
    writeTeamFileMock.mockResolvedValue(undefined);

    const initCommand = await loadInitCommand();
    initCommand.exitOverride();

    await initCommand.parseAsync([], { from: 'user' });

    expect(writeTeamFileMock).toHaveBeenCalledWith(
      expect.stringContaining('team.md'),
      expect.objectContaining({
        members: [],
      })
    );
  });
});
