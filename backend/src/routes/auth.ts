import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { signToken, verifyPassword, authMiddleware, type AuthRequest } from '../lib/auth';
import { serializeUser } from '../lib/serialize';

const router = Router();

// POST /api/auth/login → { token, user }
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const user = await prisma.user.findUnique({ where: { email: String(email) } });
  if (!user || !verifyPassword(String(password), user.password)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = signToken({ sub: user.id, role: user.role });
  return res.json({ token, user: serializeUser(user) });
});

// GET /api/auth/me → current user (from Bearer JWT)
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'user not found' });
  return res.json(serializeUser(user));
});

export default router;
