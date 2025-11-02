import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const parseCSVMock = vi.fn();
const parseMarkdownMock = vi.fn();
const writeFeaturesMock = vi.fn();
const readFeaturesMock = vi.fn();

vi.mock('../utils/csv-handler.js', () => ({
  CSVHandler: {
    parseCSV: parseCSVMock,
    parseMarkdown: parseMarkdownMock,
    writeFeatures: writeFeaturesMock,
    readFeatures: readFeaturesMock,
  },
}));

const loadCommands = async () => {
  vi.resetModules();
  const module = await import('./simple.js');
  return {
    simpleCommand: module.simpleCommand,
    listCommand: module.listCommand,
    statsCommand: module.statsCommand,
  };
};

describe('simple CLI commands', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    parseCSVMock.mockReset();
    parseMarkdownMock.mockReset();
    writeFeaturesMock.mockReset();
    readFeaturesMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a CSV template by default', async () => {
    const features = [
      {
        id: 'feat-001',
        name: 'Feature One',
        description: 'Desc',
        estimate: 8,
        assignee: 'Alice',
        priority: 'high',
        status: 'todo',
        category: 'Core',
        tags: [],
        createdDate: undefined,
        dueDate: undefined,
      },
    ];

    parseCSVMock.mockReturnValue(features);
    writeFeaturesMock.mockResolvedValue(undefined);

    const { simpleCommand } = await loadCommands();
    simpleCommand.exitOverride();

    await simpleCommand.parseAsync(['--format', 'csv', '--output', 'features'], { from: 'user' });

    expect(parseCSVMock).toHaveBeenCalledTimes(1);
    expect(writeFeaturesMock).toHaveBeenCalledWith('features.csv', features);
    expect(logSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('informs user when list filters remove all features', async () => {
    readFeaturesMock.mockResolvedValue([
      {
        id: 'feat-001',
        name: 'Feature One',
        description: 'Desc',
        estimate: 8,
        assignee: 'Alice',
        priority: 'high',
        status: 'todo',
        category: 'Core',
        tags: [],
        createdDate: undefined,
        dueDate: undefined,
      },
    ]);

    const { listCommand } = await loadCommands();
    listCommand.exitOverride();

    await listCommand.parseAsync(['--input', 'features.csv', '--status', 'done'], { from: 'user' });

    expect(readFeaturesMock).toHaveBeenCalledWith('features.csv');
    const messages = logSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((msg) => msg.includes('没有找到匹配的功能'))).toBe(true);
  });

  it('shows message when no statistics available', async () => {
    readFeaturesMock.mockResolvedValue([]);

    const { statsCommand } = await loadCommands();
    statsCommand.exitOverride();

    await statsCommand.parseAsync(['--input', 'features.csv'], { from: 'user' });

    expect(readFeaturesMock).toHaveBeenCalledWith('features.csv');
    const messages = logSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((msg) => msg.includes('没有功能数据'))).toBe(true);
  });
});
