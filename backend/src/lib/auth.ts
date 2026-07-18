import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export type Role = 'ADMIN' | 'USER';

export interface AuthUser {
  id: number;
  role: Role;
}

// Express request carrying the authenticated principal (set by authMiddleware).
export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): unknown {
  return jwt.verify(token, SECRET);
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Bearer-JWT gate: populates req.user from the token or 401s.
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'authentication required' });
    return;
  }
  try {
    const payload = verifyToken(token) as { sub?: number | string; role?: Role };
    if (payload.sub === undefined || !payload.role) {
      res.status(401).json({ error: 'invalid token' });
      return;
    }
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

// Role gate — use after authMiddleware. requireRole('ADMIN') → 403 for non-admins.
export function requireRole(role: Role) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'authentication required' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}
