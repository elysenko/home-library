import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  mockApi,
  deriveStatus,
  isOverdue,
  TODAY,
  type Book,
  type Loan,
  type LoanFilter,
} from '../mock/store';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, LoadingState, Modal, StatusBadge, Toast } from '../components/ui';

const FILTERS: { key: LoanFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lent', label: 'On loan' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

function isFilter(v: string | null): v is LoanFilter {
  return v === 'all' || v === 'lent' || v === 'overdue' || v === 'returned';
}

export default function Loans() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const raw = params.get('status');
  const filter: LoanFilter = isFilter(raw) ? raw : 'all';

  const [loans, setLoans] = useState<Loan[]>([]);
  const [counts, setCounts] = useState<Record<LoanFilter, number>>({ all: 0, lent: 0, overdue: 0, returned: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [returning, setReturning] = useState<number | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }

  function setFilter(next: LoanFilter) {
    setParams(next === 'all' ? {} : { status: next }, { replace: false });
  }

  async function load() {
    if (!user) return;
    setStatus('loading');
    try {
      const rows = await mockApi.listLoans(filter);
      setLoans(rows);
      // counts across the user's full scope (not the current filter)
      const scope = await mockApi.listLoans('all');
      setCounts({
        all: scope.length,
        lent: scope.filter((l) => deriveStatus(l) === 'lent').length,
        overdue: scope.filter((l) => deriveStatus(l) === 'overdue').length,
        returned: scope.filter((l) => deriveStatus(l) === 'returned').length,
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user]);

  useEffect(() => {
    mockApi.listBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  async function handleReturn(loan: Loan) {
    setReturning(loan.id);
    try {
      await mockApi.returnLoan(loan.id);
      flash(`“${loan.book_title}” marked returned`);
      await load();
    } finally {
      setReturning(null);
    }
  }

  const scopeNote = user?.role === 'ADMIN' ? 'All household loans' : 'Loans you logged';

  return (
    <main className="page" data-testid="loans-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Circulation</div>
          <h1 className="page-title" data-testid="loans-title">
            Loans
          </h1>
          <p className="page-sub">{scopeNote} · viewing “{FILTERS.find((f) => f.key === filter)?.label}”.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} data-testid="log-loan">
          <span aria-hidden>＋</span> Log a loan
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Filter loans by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`seg ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              <span className="count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' && <LoadingState label="Loading loans" />}
      {status === 'error' && <ErrorState message="We couldn't load loans." onRetry={load} />}

      {status === 'ready' && loans.length === 0 && (
        <EmptyState
          icon="🔖"
          title={filter === 'overdue' ? 'Nothing overdue' : 'No loans here'}
          message={
            filter === 'all'
              ? 'Log a loan to start tracking who borrowed what.'
              : `No loans with status “${filter}”.`
          }
          action={
            filter === 'all' ? (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                ＋ Log a loan
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setFilter('all')}>
                View all loans
              </button>
            )
          }
        />
      )}

      {status === 'ready' && loans.length > 0 && (
        <div className="loan-list" data-testid="loans-list">
          {loans.map((l) => (
            <article className="loan-row" key={l.id} data-testid="loan-row">
              <div className="loan-main">
                <div className="loan-book">{l.book_title}</div>
                <div className="loan-line">
                  Borrowed by <strong>{l.borrower_name}</strong>
                </div>
                <div className="loan-line">
                  Due <strong>{l.due_date}</strong>
                  {l.returned_at && <> · returned {l.returned_at}</>}
                  {isOverdue(l) && <span className="overdue-flag"> · overdue</span>}
                </div>
                {user?.role === 'ADMIN' && <div className="loan-line cell-muted">Logged by member #{l.user_id}</div>}
              </div>
              <div className="loan-side">
                <StatusBadge loan={l} />
                {l.status === 'lent' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleReturn(l)}
                    disabled={returning === l.id}
                    data-testid={`return-${l.id}`}
                  >
                    {returning === l.id ? 'Returning…' : 'Mark returned'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Log a loan" onClose={() => setShowForm(false)}>
          <LoanForm
            books={books}
            submitting={saving}
            onCancel={() => setShowForm(false)}
            onSubmit={async (input) => {
              if (!user) return;
              setSaving(true);
              try {
                await mockApi.createLoan({ ...input, user_id: user.id });
                setShowForm(false);
                flash('Loan logged');
                await load();
              } finally {
                setSaving(false);
              }
            }}
          />
        </Modal>
      )}

      <Toast message={toast} />
    </main>
  );
}

function LoanForm({
  books,
  submitting,
  onSubmit,
  onCancel,
}: {
  books: Book[];
  submitting: boolean;
  onSubmit: (input: { book_id: number; borrower_name: string; due_date: string }) => void;
  onCancel: () => void;
}) {
  const defaultDue = useMemo(() => {
    // one week from the mockup's "today"
    const d = new Date(`${TODAY}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const [bookId, setBookId] = useState<number | ''>(books[0]?.id ?? '');
  const [borrower, setBorrower] = useState('');
  const [due, setDue] = useState(defaultDue);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!bookId) next.book = 'Choose a book';
    if (!borrower.trim()) next.borrower = 'Borrower name is required';
    if (!due) next.due = 'Due date is required';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ book_id: Number(bookId), borrower_name: borrower.trim(), due_date: due });
  }

  return (
    <form onSubmit={submit} data-testid="loan-form">
      <div className="field">
        <label htmlFor="lf-book">Book</label>
        <select id="lf-book" value={bookId} onChange={(e) => setBookId(Number(e.target.value))}>
          <option value="" disabled>
            Select a book…
          </option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} — {b.author}
            </option>
          ))}
        </select>
        {errors.book && <span className="hint" style={{ color: 'var(--danger)' }}>{errors.book}</span>}
      </div>
      <div className="field">
        <label htmlFor="lf-borrower">Borrower name</label>
        <input id="lf-borrower" value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="Who's borrowing it?" />
        {errors.borrower && <span className="hint" style={{ color: 'var(--danger)' }}>{errors.borrower}</span>}
      </div>
      <div className="field">
        <label htmlFor="lf-due">Due date</label>
        <input id="lf-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        {errors.due && <span className="hint" style={{ color: 'var(--danger)' }}>{errors.due}</span>}
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="loan-form-submit">
          {submitting ? 'Saving…' : 'Log loan'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
