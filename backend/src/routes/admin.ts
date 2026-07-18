import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, requireRole } from '../lib/auth';
import { serializeUser } from '../lib/serialize';

const router = Router();

// GET /api/admin/users — ADMIN only: everyone with library access.
router.get('/users', authMiddleware, requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(users.map(serializeUser));
});

export default router;
