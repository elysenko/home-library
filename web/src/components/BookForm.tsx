import { useState } from 'react';
import type { Book } from '../mock/store';

export type BookInput = Omit<Book, 'id' | 'created_at'>;

const GENRES = [
  'Science Fiction',
  'Fantasy',
  'Literary Fiction',
  'Nature',
  'Psychology',
  'History',
  'Biography',
  'Poetry',
  'Reference',
  'Other',
];

export default function BookForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Book;
  submitting: boolean;
  onSubmit: (input: BookInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BookInput>({
    title: initial?.title ?? '',
    author: initial?.author ?? '',
    genre: initial?.genre ?? 'Science Fiction',
    isbn: initial?.isbn ?? '',
    shelf_location: initial?.shelf_location ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof BookInput>(key: K, value: BookInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!form.author.trim()) next.author = 'Author is required';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={submit} data-testid="book-form">
      <div className="field">
        <label htmlFor="bf-title">Title</label>
        <input id="bf-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Book title" />
        {errors.title && <span className="hint" style={{ color: 'var(--danger)' }}>{errors.title}</span>}
      </div>
      <div className="field">
        <label htmlFor="bf-author">Author</label>
        <input id="bf-author" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Author name" />
        {errors.author && <span className="hint" style={{ color: 'var(--danger)' }}>{errors.author}</span>}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="bf-genre">Genre</label>
          <select id="bf-genre" value={form.genre} onChange={(e) => set('genre', e.target.value)}>
            {GENRES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bf-shelf">Shelf location</label>
          <input id="bf-shelf" value={form.shelf_location} onChange={(e) => set('shelf_location', e.target.value)} placeholder="e.g. A3" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="bf-isbn">ISBN</label>
        <input id="bf-isbn" value={form.isbn} onChange={(e) => set('isbn', e.target.value)} placeholder="978-…" />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="book-form-submit">
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add book'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
