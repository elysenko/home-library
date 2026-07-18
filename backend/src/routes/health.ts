import { Router } from 'express';

const router = Router();

// Platform backend reachability probe (descriptor backend_probe_path).
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
