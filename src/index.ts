// PMSpec Core Exports
export * from './core/project.js';
export * from './core/team.js';
export * from './core/workload.js';
export * from './core/parser.js';
export * from './core/changelog.js';
export * from './core/changelog-service.js';
export * from './core/importers.js';
export * from './utils/markdown.js';
export * from './utils/validation.js';

// Re-export types for convenience
export type { Epic, Feature, UserStory, Project } from './core/project.js';
export type { Team, TeamMember } from './core/team.js';
export type { ChangelogEntry, ChangelogFile, ChangelogQueryOptions } from './core/changelog.js';
export type { ChangelogService } from './core/changelog-service.js';
export type { 
  ImportSource, 
  ImportOptions, 
  ImportResult, 
  ImportedEpic, 
  ImportedMilestone,
  Importer 
} from './core/importers.js';
