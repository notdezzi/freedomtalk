/**
 * Auth Middleware
 * JWT Authentication and Authorization
 * FreedomTalk Backend - Discord Clone
 */

import { Request, Response, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/jwt';
import { getUserById } from '@/lib/users';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from header
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    // Verify token
    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }

    // Attach user to request
    (req as AuthRequest).user = payload;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authMiddleware(req, res, next);
}

export async function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await authMiddleware(req, res, () => {});

    const user = await getUserById((req as AuthRequest).user!.userId);
    const userPermissions = user.roles.reduce((acc: number, role: any) => acc | role.permissions, 0);

    if (!(userPermissions & permission)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }

    next();
  };
}

export function NextFunction {
  // Next.js 15 type
}
