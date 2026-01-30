import { Router, Request, Response } from 'express';
import {
  createUser,
  validateCredentials,
  generateToken,
  getAllUsers,
  updateUserRole,
  getUserById,
} from './service';
import { authenticate, requireRole, requirePermission } from './middleware';
import { Role } from './types';

const router = Router();

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        type: 'https://pmspec.dev/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Email and password are required',
      });
    }

    const user = await validateCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        type: 'https://pmspec.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
      });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({
      type: 'https://pmspec.dev/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Login failed',
    });
  }
});

/**
 * POST /auth/register
 * Register a new user (admin only in production)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'viewer' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        type: 'https://pmspec.dev/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Email, password, and name are required',
      });
    }

    const user = await createUser(email, password, name, role as Role);
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    if (error instanceof Error && error.message === 'User already exists') {
      return res.status(409).json({
        type: 'https://pmspec.dev/errors/conflict',
        title: 'Conflict',
        status: 409,
        detail: 'User with this email already exists',
      });
    }
    res.status(500).json({
      type: 'https://pmspec.dev/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Registration failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = getUserById(req.user!.userId);
  if (!user) {
    return res.status(404).json({
      type: 'https://pmspec.dev/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'User not found',
    });
  }
  res.json(user);
});

/**
 * GET /auth/users
 * List all users (admin only)
 */
router.get(
  '/users',
  authenticate,
  requirePermission('canManageUsers'),
  (_req: Request, res: Response) => {
    const users = getAllUsers();
    res.json(users);
  }
);

/**
 * PATCH /auth/users/:userId/role
 * Update user role (admin only)
 */
router.patch(
  '/users/:userId/role',
  authenticate,
  requirePermission('canManageUsers'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({
          type: 'https://pmspec.dev/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid role. Must be admin, editor, or viewer',
        });
      }

      const user = await updateUserRole(userId, role as Role);
      if (!user) {
        return res.status(404).json({
          type: 'https://pmspec.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'User not found',
        });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({
        type: 'https://pmspec.dev/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to update user role',
      });
    }
  }
);

export default router;
