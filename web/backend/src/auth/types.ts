export type Role = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

// Default config (override in production via environment variables)
export const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'pmspec-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
};

// Role permissions matrix
export const permissions = {
  admin: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canViewAuditLog: true,
  },
  editor: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLog: false,
  },
  viewer: {
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canViewAuditLog: false,
  },
} as const;

export type Permission = keyof typeof permissions.admin;

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissions[role][permission];
}
