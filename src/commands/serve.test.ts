import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

const spawnMock = vi.fn();
const accessMock = vi.fn();
const openMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('fs/promises', () => ({
  access: accessMock,
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('open', () => ({
  default: openMock,
}));

const loadServeCommand = async () => {
  vi.resetModules();
  const module = await import('./serve.js');
  return module.serveCommand;
};

describe('serve command', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    spawnMock.mockReset();
    accessMock.mockReset();
    openMock.mockReset();
    accessMock.mockResolvedValue(undefined);
    openMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts backend server and opens browser when requested', async () => {
    const backendProcessMock = {
      kill: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        return backendProcessMock;
      }),
    };

    spawnMock.mockReturnValue(backendProcessMock as any);

    const serveCommand = await loadServeCommand();

    const processOnSpy = vi
      .spyOn(process, 'on')
      .mockImplementation(((event: any, handler: any) => process) as any);

    const processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as any);

    serveCommand.exitOverride();

    await serveCommand.parseAsync(['--port', '4000', '--open'], { from: 'user' });

    expect(accessMock).toHaveBeenCalledWith(
      expect.stringContaining(path.join('web', 'backend', 'src', 'server.ts')),
    );

    expect(spawnMock).toHaveBeenCalledWith(
      'npx',
      ['ts-node-dev', '--respawn', '--transpile-only', expect.stringContaining('server.ts')],
      expect.objectContaining({
        cwd: expect.stringContaining(path.join('web', 'backend')),
        env: expect.objectContaining({ PORT: '4000' }),
        shell: true,
        stdio: 'inherit',
      }),
    );

    expect(backendProcessMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(backendProcessMock.on).toHaveBeenCalledWith('exit', expect.any(Function));

    vi.advanceTimersByTime(2000);
    await Promise.resolve();

    expect(openMock).toHaveBeenCalledWith('http://localhost:4000');

    processOnSpy.mockRestore();
    processExitSpy.mockRestore();
  });
});
