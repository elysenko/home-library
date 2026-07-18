import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { mockApi, coverFor, deriveStatus, type Book, type Loan } from '../mock/store';
import { EmptyState, ErrorState, LoadingState, Modal, StatusBadge, Toast } from '../components/ui';
import BookForm, { type BookInput } from '../components/BookForm';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState<Loan[]>([]);

  async function load() {
    setStatus('loading');
    try {
      const b = await mockApi.getBook(bookId);
      if (!b) {
        setStatus('notfound');
        return;
      }
      setBook(b);
      const loans = await mockApi.listLoans('all');
      setHistory(loans.filter((l) => l.book_id === b.id));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  async function handleEdit(input: BookInput) {
    setSaving(true);
    try {
      await mockApi.updateBook(bookId, input);
      setEditing(false);
      setToast('Book updated');
      window.setTimeout(() => setToast(''), 2400);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await mockApi.deleteBook(bookId);
      navigate('/books');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page" data-testid="book-detail-page">
      <Link to="/books" className="back-link">
        ← Back to catalog
      </Link>

      {status === 'loading' && <LoadingState label="Loading book" />}
      {status === 'error' && <ErrorState message="We couldn't load this book." onRetry={load} />}
      {status === 'notfound' && (
        <EmptyState
          icon="🔍"
          title="Book not found"
          message={`No book exists with id ${id}. It may have been removed.`}
          action={
            <Link to="/books" className="btn btn-primary">
              Browse the catalog
            </Link>
          }
        />
      )}

      {status === 'ready' && book && (
        <>
          <div className="detail-grid">
            <div className="detail-cover" style={{ background: coverFor(book.id) }}>
              <span className="spine-title">{book.title}</span>
            </div>
            <div>
              <div className="eyebrow">{book.genre}</div>
              <h1 className="page-title" data-testid="book-detail-title">
                {book.title}
              </h1>
              <p className="page-sub" style={{ fontSize: 16 }}>
                by {book.author}
              </p>

              <div className="detail-facts">
                <div className="fact">
                  <div className="fact-label">ISBN</div>
                  <div className="fact-value">{book.isbn || '—'}</div>
                </div>
                <div className="fact">
                  <div className="fact-label">Shelf</div>
                  <div className="fact-value">{book.shelf_location || '—'}</div>
                </div>
                <div className="fact">
                  <div className="fact-label">Genre</div>
                  <div className="fact-value">{book.genre}</div>
                </div>
                <div className="fact">
                  <div className="fact-label">Added</div>
                  <div className="fact-value">{book.created_at}</div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => setEditing(true)} data-testid="edit-book">
                  Edit book
                </button>
                <Link to={`/loans`} className="btn btn-ghost">
                  Log a loan
                </Link>
                <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <hr className="divider" />

          <h2 className="section-title">Loan history</h2>
          <p className="section-sub">Every time this title has been lent out.</p>
          {history.length === 0 ? (
            <EmptyState icon="🔖" title="Never been lent" message="This book hasn't been loaned out yet." />
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Due date</th>
                    <th>Status</th>
                    <th>Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((l) => (
                    <tr key={l.id}>
                      <td className="cell-strong">{l.borrower_name}</td>
                      <td>{l.due_date}</td>
                      <td>
                        <StatusBadge loan={l} />
                      </td>
                      <td className="cell-muted">{l.returned_at ?? (deriveStatus(l) === 'overdue' ? 'Overdue' : 'On loan')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && book && (
        <Modal title="Edit book" onClose={() => setEditing(false)}>
          <BookForm initial={book} submitting={saving} onSubmit={handleEdit} onCancel={() => setEditing(false)} />
        </Modal>
      )}

      {confirmDelete && book && (
        <Modal title="Remove book?" onClose={() => setConfirmDelete(false)}>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
            Remove <strong>“{book.title}”</strong> from the catalog? This can't be undone.
          </p>
          <div className="form-actions">
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Removing…' : 'Remove book'}
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </main>
  );
}
