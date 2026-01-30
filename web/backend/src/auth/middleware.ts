import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById } from './service';
import { Role, Permission, hasPermission, TokenPayload } from './types';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 * Adds user info to req.user if valid
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://pmspec.dev/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      type: 'https://pmspec.dev/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid or expired token',
    });
  }

  req.user = payload;
  next();
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://pmspec.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        type: 'https://pmspec.dev/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: `Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware to require specific permission(s)
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://pmspec.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      });
    }

    const missingPermissions = permissions.filter(
      (p) => !hasPermission(req.user!.role, p)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        type: 'https://pmspec.dev/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: `Missing permissions: ${missingPermissions.join(', ')}`,
      });
    }

    next();
  };
}
