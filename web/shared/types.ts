// Shared types between frontend and backend

export type DependencyType = 'blocks' | 'relates-to';

export interface Dependency {
  featureId: string;
  type: DependencyType;
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed';
  owner: string;
  estimate: number;
  actual: number;
  features: string[];
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type WorkloadSize = 'S' | 'M' | 'L' | 'XL';
export type MilestoneStatus = 'upcoming' | 'active' | 'completed' | 'missed';

export interface Feature {
  id: string;
  epic: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority?: Priority;
  assignee: string;
  estimate: number;
  actual: number;
  skillsRequired: string[];
  userStories?: UserStory[];
  acceptanceCriteria?: string[];
  dependencies?: Dependency[];
}

export interface UserStory {
  id: string;
  title: string;
  estimate: number;
  status: 'todo' | 'in-progress' | 'done';
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  status: MilestoneStatus;
  features: string[];
}

export interface TeamMember {
  name: string;
  skills: string[];
  capacity: number;
  currentLoad: number;
}

export interface Team {
  members: TeamMember[];
}

export interface Project {
  name: string;
  description: string;
  timeline: {
    start: string;
    end: string;
  };
  teamCapacity: {
    total: number;
    available: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
