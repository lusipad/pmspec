import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const readdirMock = vi.fn();
const readEpicFileMock = vi.fn();
const readFeatureFileMock = vi.fn();
const readTeamFileMock = vi.fn();
const validateProjectMock = vi.fn();
const formatValidationIssuesMock = vi.fn();

vi.mock('fs/promises', () => ({
  readdir: readdirMock,
}));

vi.mock('../core/parser.js', () => ({
  readEpicFile: readEpicFileMock,
  readFeatureFile: readFeatureFileMock,
  readTeamFile: readTeamFileMock,
}));

vi.mock('../utils/validation.js', () => ({
  validateProject: validateProjectMock,
  formatValidationIssues: formatValidationIssuesMock,
}));

const loadValidateCommand = async () => {
  vi.resetModules();
  const module = await import('./validate.js');
  return module.validateCommand;
};

describe('validate command', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  beforeEach(() => {
    readdirMock.mockReset();
    readEpicFileMock.mockReset();
    readFeatureFileMock.mockReset();
    readTeamFileMock.mockReset();
    validateProjectMock.mockReset();
    formatValidationIssuesMock.mockReset();
    logSpy.mockClear();
    errorSpy.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('validates entire project successfully', async () => {
    readdirMock
      .mockResolvedValueOnce(['epic-001.md'])
      .mockResolvedValueOnce(['feat-001.md']);
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: ['FEAT-001'],
    });
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: [],
    });
    readTeamFileMock.mockResolvedValue({ members: [] });
    validateProjectMock.mockReturnValue({ valid: true, issues: [] });
    formatValidationIssuesMock.mockReturnValue('All validations passed ✓');

    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync([], { from: 'user' });

    expect(validateProjectMock).toHaveBeenCalled();
    expect(formatValidationIssuesMock).toHaveBeenCalled();
  });

  it('validates specific epic by ID', async () => {
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Valid Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: [],
    });

    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync(['EPIC-001'], { from: 'user' });

    expect(readEpicFileMock).toHaveBeenCalledWith(expect.stringContaining('epic-001.md'));
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('EPIC-001') && msg.includes('valid'))).toBe(true);
  });

  it('validates specific feature by ID', async () => {
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Valid Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: [],
    });

    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync(['FEAT-001'], { from: 'user' });

    expect(readFeatureFileMock).toHaveBeenCalledWith(expect.stringContaining('feat-001.md'));
    const messages = logSpy.mock.calls.map(call => String(call[0]));
    expect(messages.some(msg => msg.includes('FEAT-001') && msg.includes('valid'))).toBe(true);
  });

  it('exits with error when validation fails', async () => {
    readdirMock
      .mockResolvedValueOnce(['epic-001.md'])
      .mockResolvedValueOnce(['feat-001.md']);
    readEpicFileMock.mockResolvedValue({
      id: 'EPIC-001',
      title: 'Test Epic',
      status: 'planning',
      estimate: 40,
      actual: 0,
      features: ['FEAT-999'],
    });
    readFeatureFileMock.mockResolvedValue({
      id: 'FEAT-001',
      title: 'Test Feature',
      epicId: 'EPIC-001',
      status: 'todo',
      estimate: 16,
      actual: 0,
      skillsRequired: [],
    });
    readTeamFileMock.mockRejectedValue({ code: 'ENOENT' });
    validateProjectMock.mockReturnValue({
      valid: false,
      issues: [{ level: 'ERROR', message: 'Invalid reference FEAT-999' }],
    });
    formatValidationIssuesMock.mockReturnValue('1 ERROR(S): Invalid reference FEAT-999');

    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles invalid ID format', async () => {
    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync(['INVALID-001'], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorMessages = errorSpy.mock.calls.map(call => String(call[0]));
    expect(errorMessages.some(msg => msg.includes('Invalid ID'))).toBe(true);
  });

  it('handles directory read errors', async () => {
    readdirMock.mockRejectedValue(new Error('Cannot read directory'));

    const validateCommand = await loadValidateCommand();
    validateCommand.exitOverride();

    await validateCommand.parseAsync([], { from: 'user' });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
