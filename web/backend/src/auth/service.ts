import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authConfig, TokenPayload, User, Role } from './types';

// In-memory user store (replace with database in production)
const users = new Map<string, User & { passwordHash: string }>();

// Initialize with a default admin user for development
const initDefaultAdmin = async () => {
  if (users.size === 0) {
    const passwordHash = await bcrypt.hash('admin123', authConfig.bcryptRounds);
    users.set('admin@pmspec.local', {
      id: 'user-001',
      email: 'admin@pmspec.local',
      name: 'Admin',
      role: 'admin',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};

initDefaultAdmin();

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: Role = 'viewer'
): Promise<User> {
  if (users.has(email)) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds);
  const user: User & { passwordHash: string } = {
    id: `user-${Date.now()}`,
    email,
    name,
    role,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(email, user);

  // Return without password hash
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = users.get(email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, authConfig.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function getUserById(userId: string): User | null {
  for (const user of users.values()) {
    if (user.id === userId) {
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }
  }
  return null;
}

export function getAllUsers(): User[] {
  return Array.from(users.values()).map(({ passwordHash: _, ...user }) => user);
}

export async function updateUserRole(userId: string, role: Role): Promise<User | null> {
  for (const [email, user] of users.entries()) {
    if (user.id === userId) {
      user.role = role;
      user.updatedAt = new Date();
      users.set(email, user);
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    }
  }
  return null;
}
