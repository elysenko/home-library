// Serializers: map Prisma rows to the snake_case, integer-id shapes the
// approved frontend (web/src/mock/store.ts types) expects. Dates are emitted
// as `YYYY-MM-DD` so the client's lexicographic overdue comparison holds.
import type { User, Book, Loan } from '@prisma/client';

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function serializeUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    created_at: dateOnly(u.createdAt),
  };
}

export function serializeBook(b: Book) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    isbn: b.isbn,
    shelf_location: b.shelfLocation,
    created_at: dateOnly(b.createdAt),
  };
}

export function serializeLoan(l: Loan & { book?: { title: string } | null }) {
  return {
    id: l.id,
    book_id: l.bookId,
    book_title: l.book?.title ?? '',
    borrower_name: l.borrowerName,
    due_date: dateOnly(l.dueDate),
    status: l.status,
    returned_at: l.returnedAt ? dateOnly(l.returnedAt) : null,
    user_id: l.userId,
    created_at: dateOnly(l.createdAt),
  };
}
