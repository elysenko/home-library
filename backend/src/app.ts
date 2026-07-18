import express from 'express';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import booksRouter from './routes/books';
import loansRouter from './routes/loans';
import adminRouter from './routes/admin';

export const app = express();
app.use(express.json());

// API surface. nginx proxies /api/ -> this service (:3000) and serves the SPA;
// the backend is API-only. Route order keeps all app routes under /api/*.
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/loans', loansRouter);
app.use('/api/admin', adminRouter);

// JSON 404 for unknown API paths.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not found' });
});
