import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../lib/auth';
import { serializeBook } from '../lib/serialize';

const router = Router();

// All book routes require an authenticated user.
router.use(authMiddleware);

// Accepts a string or an omitted value; any other type (number, boolean,
// object, array, null) is rejected rather than String()-coerced.
function readField(value: unknown): string | null {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  return value.trim();
}

function readBookInput(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = readField(b.title);
  const author = readField(b.author);
  const genre = readField(b.genre);
  const isbn = readField(b.isbn);
  const shelfLocation = readField(b.shelf_location);
  // A null means a non-string value was supplied → invalid input.
  if (title === null || author === null || genre === null || isbn === null || shelfLocation === null) {
    return null;
  }
  if (!title || !author) return null;
  return { title, author, genre, isbn, shelfLocation };
}

// GET /api/books — shared household catalog.
router.get('/', async (_req, res) => {
  const books = await prisma.book.findMany({ orderBy: { title: 'asc' } });
  res.json(books.map(serializeBook));
});

// POST /api/books
router.post('/', async (req, res) => {
  const input = readBookInput(req.body);
  if (!input) return res.status(400).json({ error: 'title and author are required' });
  const book = await prisma.book.create({ data: input });
  res.status(201).json(serializeBook(book));
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) return res.status(404).json({ error: 'book not found' });
  res.json(serializeBook(book));
});

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  const input = readBookInput(req.body);
  if (!input) return res.status(400).json({ error: 'title and author are required' });
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'book not found' });
  const book = await prisma.book.update({ where: { id }, data: input });
  res.json(serializeBook(book));
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'book not found' });
  await prisma.book.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
