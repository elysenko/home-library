// ============================================================
// Data layer for the Lending Ledger UI.
//
// A thin client over the live Express + Prisma API (same-origin
// /api/*, proxied by nginx in prod and by vite in dev). Every method
// below performs a real HTTP request via `api()` — there are no
// fixtures, no simulated latency, and no in-memory collections.
// ============================================================
import { api } from './api';

export type Role = 'ADMIN' | 'USER';
export type LoanStatus = 'lent' | 'returned';
export type LoanFilter = 'all' | 'lent' | 'returned' | 'overdue';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  shelf_location: string;
  created_at: string;
}

export interface Loan {
  id: number;
  book_id: number;
  book_title: string;
  borrower_name: string;
  due_date: string; // ISO date (YYYY-MM-DD)
  status: LoanStatus;
  returned_at: string | null;
  user_id: number;
  created_at: string;
}

export interface ServiceSetting {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean; value: string }[];
  configured: boolean;
}

// "today" anchor (real current date) so overdue derivation matches the server.
export const TODAY = new Date().toISOString().slice(0, 10);

// ---- pure UI helpers (used across pages) --------------------
export function isOverdue(loan: Loan): boolean {
  return loan.status === 'lent' && loan.due_date < TODAY;
}

export function deriveStatus(loan: Loan): LoanFilter {
  if (loan.status === 'returned') return 'returned';
  return isOverdue(loan) ? 'overdue' : 'lent';
}

const COVER_GRADIENTS = [
  'linear-gradient(150deg,#7c4a2d,#c8842a)',
  'linear-gradient(150deg,#2b4a6b,#4a86b0)',
  'linear-gradient(150deg,#3a5a40,#7d9d6c)',
  'linear-gradient(150deg,#5a3a5e,#a06a9a)',
  'linear-gradient(150deg,#6b2b2b,#c05a4a)',
  'linear-gradient(150deg,#2b5a58,#5aa39a)',
];
export function coverFor(id: number): string {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
}

// ---- Admin → Service settings (static config surface) -------
export const settings: ServiceSetting[] = [
  {
    key: 'postgresql',
    label: 'PostgreSQL',
    description: 'Primary relational datastore connection.',
    icon: '🐘',
    color: '#336791',
    configured: true,
    fields: [
      { key: 'PGHOST', label: 'Host', placeholder: 'db.internal', value: 'db.internal' },
      { key: 'PGPORT', label: 'Port', placeholder: '5432', value: '5432' },
      { key: 'PGDATABASE', label: 'Database', placeholder: 'library', value: 'library' },
      { key: 'PGUSER', label: 'User', placeholder: 'ledger', value: 'ledger' },
      { key: 'PGPASSWORD', label: 'Password', placeholder: '••••••••', secret: true, value: 'super-secret-pw' },
    ],
  },
  {
    key: 'minio',
    label: 'MinIO Object Storage',
    description: 'S3-compatible storage for cover images & exports.',
    icon: '🪣',
    color: '#c72e49',
    configured: false,
    fields: [
      { key: 'MINIO_ENDPOINT', label: 'Endpoint', placeholder: 'minio.internal:9000', value: '' },
      { key: 'MINIO_ACCESS_KEY', label: 'Access Key', placeholder: 'access-key', value: '' },
      { key: 'MINIO_SECRET_KEY', label: 'Secret Key', placeholder: '••••••••', secret: true, value: '' },
      { key: 'MINIO_BUCKET', label: 'Bucket', placeholder: 'library-assets', value: '' },
    ],
  },
];

// ---- live API client ----------------------------------------
// Role scoping (USER sees own loans, ADMIN sees all) is enforced server-side
// from the JWT; the status `filter` is applied server-side via `?status=` so
// overdue derivation uses the server clock (UTC).

export type BookInput = Omit<Book, 'id' | 'created_at'>;

export const ledgerApi = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return api<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<User> {
    return api<User>('/api/auth/me');
  },

  async listBooks(): Promise<Book[]> {
    return api<Book[]>('/api/books');
  },

  async getBook(id: number): Promise<Book | null> {
    try {
      return await api<Book>(`/api/books/${id}`);
    } catch {
      return null;
    }
  },

  async createBook(input: BookInput): Promise<Book> {
    return api<Book>('/api/books', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateBook(id: number, input: BookInput): Promise<Book> {
    return api<Book>(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },

  async deleteBook(id: number): Promise<void> {
    await api<{ ok: boolean }>(`/api/books/${id}`, { method: 'DELETE' });
  },

  async listLoans(filter: LoanFilter = 'all'): Promise<Loan[]> {
    const qs = filter === 'all' ? '' : `?status=${encodeURIComponent(filter)}`;
    const rows = await api<Loan[]>(`/api/loans${qs}`);
    return [...rows].sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  async createLoan(input: {
    book_id: number;
    borrower_name: string;
    due_date: string;
    user_id?: number;
  }): Promise<Loan> {
    return api<Loan>('/api/loans', {
      method: 'POST',
      body: JSON.stringify({
        book_id: input.book_id,
        borrower_name: input.borrower_name,
        due_date: input.due_date,
      }),
    });
  },

  async returnLoan(id: number): Promise<Loan> {
    return api<Loan>(`/api/loans/${id}/return`, { method: 'POST' });
  },

  async listUsers(): Promise<User[]> {
    return api<User[]>('/api/admin/users');
  },
};
