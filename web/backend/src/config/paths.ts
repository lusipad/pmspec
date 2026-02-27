import path from 'path';

const DEFAULT_WORKSPACE_ROOT = path.join(process.cwd(), '..', '..');

export function getWorkspaceRoot(): string {
  const configuredRoot = process.env.PMSPEC_WORKSPACE_ROOT?.trim();
  return configuredRoot ? path.resolve(configuredRoot) : DEFAULT_WORKSPACE_ROOT;
}

export function getPmspaceDir(): string {
  return path.join(getWorkspaceRoot(), 'pmspace');
}
