import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ledgerApi, coverFor, type Book } from '../lib/store';
import { EmptyState, ErrorState, LoadingState, Modal, Toast } from '../components/ui';
import BookForm, { type BookInput } from '../components/BookForm';

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; book: Book }>(null);
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }

  async function load() {
    setStatus('loading');
    try {
      setBooks(await ledgerApi.listBooks());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q),
    );
  }, [books, query]);

  async function handleSubmit(input: BookInput) {
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await ledgerApi.updateBook(modal.book.id, input);
        flash('Book updated');
      } else {
        await ledgerApi.createBook(input);
        flash('Book added to the catalog');
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await ledgerApi.deleteBook(confirmDelete.id);
      flash('Book removed');
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page" data-testid="books-page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Catalog</div>
          <h1 className="page-title" data-testid="books-title">
            Books
          </h1>
          <p className="page-sub">Your shared household library — {books.length} titles on the shelves.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })} data-testid="add-book">
          <span aria-hidden>＋</span> Add book
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="ico" aria-hidden>
            🔍
          </span>
          <input
            placeholder="Search by title, author or genre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="books-search"
            aria-label="Search books"
          />
        </div>
      </div>

      {status === 'loading' && <LoadingState label="Loading books" />}
      {status === 'error' && <ErrorState message="We couldn't load the catalog." onRetry={load} />}

      {status === 'ready' && filtered.length === 0 && (
        <EmptyState
          icon="📚"
          title={query ? 'No matching books' : 'Your shelves are empty'}
          message={query ? 'Try a different search term.' : 'Add your first book to start building the catalog.'}
          action={
            !query ? (
              <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
                ＋ Add your first book
              </button>
            ) : undefined
          }
        />
      )}

      {status === 'ready' && filtered.length > 0 && (
        <div className="book-grid" data-testid="books-grid">
          {filtered.map((b) => (
            <article key={b.id} className="book-card">
              <Link to={`/books/${b.id}`} className="book-cover" style={{ background: coverFor(b.id) }}>
                <span className="spine-title">{b.title}</span>
              </Link>
              <div className="book-body">
                <Link to={`/books/${b.id}`}>
                  <div className="book-title">{b.title}</div>
                </Link>
                <div className="book-author">{b.author}</div>
                <div className="book-meta">
                  <span className="chip">{b.genre}</span>
                  {b.shelf_location && <span className="chip">Shelf {b.shelf_location}</span>}
                </div>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  <Link to={`/books/${b.id}`} className="btn btn-subtle btn-sm">
                    View
                  </Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ mode: 'edit', book: b })}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(b)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit book' : 'Add a book'} onClose={() => setModal(null)}>
          <BookForm
            initial={modal.mode === 'edit' ? modal.book : undefined}
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Remove book?" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
            Remove <strong>“{confirmDelete.title}”</strong> from the catalog? This can't be undone.
          </p>
          <div className="form-actions">
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving} data-testid="confirm-delete">
              {saving ? 'Removing…' : 'Remove book'}
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)} disabled={saving}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </main>
  );
}
