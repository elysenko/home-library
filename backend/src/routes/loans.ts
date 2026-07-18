import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, type AuthRequest } from '../lib/auth';
import { serializeLoan } from '../lib/serialize';

const router = Router();

router.use(authMiddleware);

// USER sees only their own loans; ADMIN sees every household loan.
function scopeWhere(req: AuthRequest) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
}

// GET /api/loans?status=lent|returned|overdue|all
router.get('/', async (req: AuthRequest, res) => {
  const status = String(req.query.status ?? 'all');
  const where: Record<string, unknown> = { ...scopeWhere(req) };
  if (status === 'lent') {
    where.status = 'lent';
  } else if (status === 'returned') {
    where.status = 'returned';
  } else if (status === 'overdue') {
    // Floor "now" to UTC midnight so overdue is day-granular and agrees with the
    // client's date-string comparison in web/src/lib/store.ts (isOverdue).
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    where.status = 'lent';
    where.dueDate = { lt: todayUtc };
  }
  const loans = await prisma.loan.findMany({
    where,
    include: { book: { select: { title: true } } },
    orderBy: { dueDate: 'asc' },
  });
  res.json(loans.map(serializeLoan));
});

// POST /api/loans — logs a loan owned by the current user.
router.post('/', async (req: AuthRequest, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const bookId = Number(b.book_id);
  const borrowerName = String(b.borrower_name ?? '').trim();
  const dueRaw = String(b.due_date ?? '').trim();
  if (!Number.isInteger(bookId) || !borrowerName || !dueRaw) {
    return res.status(400).json({ error: 'book_id, borrower_name and due_date are required' });
  }
  const due = new Date(dueRaw);
  if (Number.isNaN(due.getTime())) return res.status(400).json({ error: 'invalid due_date' });
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return res.status(404).json({ error: 'book not found' });
  const loan = await prisma.loan.create({
    data: {
      bookId,
      borrowerName,
      dueDate: due,
      status: 'lent',
      userId: req.user!.id,
    },
    include: { book: { select: { title: true } } },
  });
  res.status(201).json(serializeLoan(loan));
});

// POST /api/loans/:id/return — marks a loan returned (own loan, or any for ADMIN).
router.post('/:id/return', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  const loan = await prisma.loan.findFirst({
    where: { id, ...scopeWhere(req) },
    include: { book: { select: { title: true } } },
  });
  if (!loan) return res.status(404).json({ error: 'loan not found' });
  // Idempotent no-op: an already-returned loan is returned as-is (200) without
  // touching returnedAt, matching the contract in .pipeline/test_spec.md.
  if (loan.status === 'returned') return res.json(serializeLoan(loan));
  const updated = await prisma.loan.update({
    where: { id },
    data: { status: 'returned', returnedAt: new Date() },
    include: { book: { select: { title: true } } },
  });
  res.json(serializeLoan(updated));
});

export default router;
