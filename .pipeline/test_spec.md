# Test Specification

> **Warning — `surface.json` is a scaffolder stub.** `.pipeline/surface.json` lists only
> `GET /api/health` and `POST /api/auth/login` (it is marked `_generated` / "overwritten by the
> scaffolder agent"). The full API surface below is therefore derived from the approved spec and
> `.pipeline/tasks.md`. Coverage counts are measured against this derived surface (12 endpoints), not
> against the stub. When the scaffolder rewrites `surface.json`, re-reconcile this file against it.
>
> **Spec-authoritative exclusions.** Per the spec's Assumptions, there is **no `/signup`** (accounts
> are seeded only) and the spec defines **no `/admin/settings`** or postgresql/minio backing services
> (these appear only in `tasks.md` open questions). Those are listed under **Out of scope** below.

## Coverage summary
- Total cases: 58
- API endpoints covered: 12 / 12 (derived surface; 2 / 2 of the `surface.json` stub)
- User journeys covered: 6

---

## API tests

Conventions: unless stated otherwise, protected endpoints require `Authorization: Bearer <JWT>`.
"USER token" = token for a seeded `USER`; "ADMIN token" = token for the seeded `ADMIN`. JSON bodies
are `application/json`.

### `GET /api/health`
- **Happy path**: no auth, no body → `200` with body exactly `{"status":"ok"}` (`Content-Type: application/json`).
- **Validation failures**: n/a (no inputs).
- **Auth failures**: n/a — must succeed without a token (used as a liveness probe).
- **Idempotency / edge cases**: repeated calls return identical `200 {"status":"ok"}`; must be reachable before seed completes.

### `POST /api/auth/login`
- **Happy path**: `{ "email": "<seeded ADMIN email>", "password": "<seeded ADMIN password>" }` → `200` with `{ token: <non-empty string>, user: { id, email, role: "ADMIN" } }`; `password_hash` MUST NOT appear in the response. Same for the seeded USER → `role: "USER"`.
- **Validation failures**:
  - Missing `email` or `password` → `400` (zod validation).
  - Malformed email (e.g. `"not-an-email"`) → `400`.
  - Empty JSON body `{}` → `400`.
- **Auth failures**:
  - Correct email, wrong password → `401` (no token issued).
  - Unknown email → `401` (same generic message — must not reveal whether the email exists).
- **Idempotency / edge cases**: two successful logins for the same account both return valid tokens; issued token decodes to the correct `sub`/`role` and is accepted by `GET /api/auth/me`.

### `GET /api/auth/me`
- **Happy path**: valid USER token → `200` `{ id, email, role: "USER" }` matching the token subject; no `password_hash`.
- **Validation failures**: n/a.
- **Auth failures**:
  - No `Authorization` header → `401`.
  - Malformed header (`Authorization: Bearer garbage`) → `401`.
  - Expired / wrong-signature JWT → `401`.
- **Idempotency / edge cases**: repeated calls with the same valid token return the same user.

### `GET /api/books`
- **Happy path**: valid token (USER or ADMIN) → `200` with a JSON array of book objects `{ id, title, author, genre, isbn, shelf_location, created_at }`. Catalog is shared, so USER and ADMIN see the same set.
- **Validation failures**: n/a (no inputs).
- **Auth failures**: no/invalid token → `401`.
- **Idempotency / edge cases**: after a `POST /api/books`, the new book appears exactly once in the list.

### `POST /api/books`
- **Happy path**: valid token + `{ title, author, genre, isbn, shelf_location }` → `201` (or `200`) with the created book including a generated `id` and `created_at`. Book is subsequently retrievable via `GET /api/books/:id`.
- **Validation failures**:
  - Missing required `title` (or `author`) → `400` (zod).
  - Wrong types (e.g. `title` as a number) → `400`.
  - Empty body `{}` → `400`.
- **Auth failures**: no/invalid token → `401`; book is NOT created (verify via list count unchanged).
- **Idempotency / edge cases**: two creates with identical bodies produce two distinct `id`s (no dedupe implied by spec).

### `GET /api/books/:id`
- **Happy path**: valid token + existing `id` → `200` with the full book object. Must succeed on a fresh request with no prior list call (supports fresh-reload deep link).
- **Validation failures**: non-numeric / malformed `:id` → `400` or `404` (must not `500`).
- **Auth failures**: no/invalid token → `401`.
- **Idempotency / edge cases**: unknown but well-formed `id` → `404`.

### `PUT /api/books/:id`
- **Happy path**: valid token + existing `id` + `{ title: "Updated", ... }` → `200` with the updated book; a subsequent `GET /api/books/:id` reflects the change.
- **Validation failures**: invalid body (e.g. `title` set to empty/null when required) → `400`.
- **Auth failures**: no/invalid token → `401`.
- **Idempotency / edge cases**: `PUT` on unknown `id` → `404`; re-applying the same update yields the same resulting state.

### `DELETE /api/books/:id`
- **Happy path**: valid token + existing `id` → `200`/`204`; the book no longer appears in `GET /api/books` and `GET /api/books/:id` → `404`.
- **Validation failures**: malformed `:id` → `400`/`404` (not `500`).
- **Auth failures**: no/invalid token → `401`; book still present afterwards.
- **Idempotency / edge cases**: deleting an already-deleted `id` → `404` (or idempotent `204`); must not error the server.

### `GET /api/loans?status=`
- **Happy path**:
  - USER token, no `status` (or `status=all`) → `200` array containing only loans where `user_id` == the USER; never another user's rows.
  - ADMIN token → `200` array containing ALL loans across users.
  - `status=lent` → only rows with `status='lent'`.
  - `status=returned` → only rows with `status='returned'`.
  - `status=overdue` → only rows derived as overdue (`status='lent' AND due_date < now`, UTC comparison); already-returned rows never appear even if their `due_date` is in the past.
- **Validation failures**: unsupported `status` value (e.g. `status=bogus`) → `400` (or documented default to `all`; assert one consistent behaviour, not `500`).
- **Auth failures**: no/invalid token → `401`.
- **Idempotency / edge cases**: a loan due next week appears under `lent`/`all` but NOT under `overdue`; a `lent` loan with `due_date` in the past appears under both `lent` and `overdue`.

### `POST /api/loans`
- **Happy path**: valid token + `{ book_id, borrower_name, due_date }` (due next week) → `201`/`200` with created loan `{ id, book_id, borrower_name, due_date, status: "lent", returned_at: null, user_id }`; `user_id` is set to the caller.
- **Validation failures**:
  - Missing `book_id` / `borrower_name` / `due_date` → `400`.
  - Malformed `due_date` (not a valid date) → `400`.
  - `book_id` referencing a non-existent book → `400`/`404` (assert a 4xx, not `500`).
- **Auth failures**: no/invalid token → `401`; no loan created.
- **Idempotency / edge cases**: created loan is owned by the caller — a different USER's `GET /api/loans` does not include it.

### `POST /api/loans/:id/return`
- **Happy path**: owner (or ADMIN) calls on a `lent` loan → `200`; loan now `status='returned'` with a non-null `returned_at`. Change persists (visible in a later `GET /api/loans?status=returned`).
- **Validation failures**: malformed `:id` → `400`/`404`.
- **Auth failures**:
  - No/invalid token → `401`.
  - USER attempting to return a loan owned by another USER → `403`/`404` (not permitted; state unchanged).
- **Idempotency / edge cases**: returning an already-returned loan → either a stable `200` (no-op, `returned_at` unchanged) or `409`; assert one consistent behaviour. Unknown `id` → `404`.

### `GET /api/admin/users`
- **Happy path**: ADMIN token → `200` array of user objects `{ id, email, role, created_at }`; includes the seeded ADMIN and USER. `password_hash` MUST NOT be present.
- **Validation failures**: n/a.
- **Auth failures**:
  - No/invalid token → `401`.
  - Valid USER token (non-admin) → `403` (role enforced by `requireRole('ADMIN')`).
- **Idempotency / edge cases**: repeated calls return the same set; count matches number of seeded/created accounts.

---

## UI / journey tests

### Journey: Login and session bootstrap
- **Steps**:
  1. Navigate to `/login` while signed out.
  2. Enter the seeded USER email + password; submit.
  3. On success, observe redirect to `/books` (or `/`→`/books`).
  4. Reload the page.
- **Expected outcomes**: token stored in `localStorage`; `GET /api/auth/me` re-hydrates the user on reload so the session survives refresh; Layout shows the "Lending Ledger" heading and nav; the admin nav section is hidden for USER.
- **Negative path**: wrong password → inline error message shown, no redirect, no token stored. Submitting an empty form → client validation blocks submit (or surfaces a `400`-driven error).

### Journey: Books catalog CRUD + deep-linkable detail
- **Steps**:
  1. Signed in, go to `/books`.
  2. Use the add-book form to create a book (title/author/genre/isbn/shelf_location); submit.
  3. Click the new book to open `/books/:id`.
  4. Copy the `/books/:id` URL, open it in a fresh tab / hard reload.
  5. Edit the book (change title) and save; then delete it.
- **Expected outcomes**: new book appears in the list without a manual refresh; `/books/:id` renders the correct book on a cold load (fetched by `:id`, not relying on in-memory list state); edit updates the visible title and persists across reload; delete removes it from the list and `/books/:id` then shows a not-found state.
- **Negative path**: submitting the add/edit form with a missing required field surfaces a validation error and does not create/modify the book; opening `/books/<unknown-id>` shows a "not found" state, not a blank crash; loading state shown while fetching.

### Journey: Loans lifecycle driven by URL `?status=`
- **Steps**:
  1. Signed in, go to `/loans`.
  2. Use the log-loan form to create a loan (pick a book, borrower name, `due_date` = next week); submit.
  3. Observe it under the `lent` filter.
  4. Click "mark returned" on that loan.
  5. Switch the filter to `returned`, then reload the page on the `returned` filter.
- **Expected outcomes**: created loan shows `status='lent'`; the loan list is driven by the URL `?status=` query (changing filter updates the URL and the visible rows); after "mark returned" the loan shows `returned` and appears under `?status=returned`; state persists across reload.
- **Negative path**: log-loan form with missing borrower/date shows validation error, no loan created; server error surfaces an error state rather than a silent failure.

### Journey: Deep-link overdue filter
- **Steps**:
  1. Ensure at least one `lent` loan has a past `due_date` and one has a future `due_date`.
  2. Open `/loans?status=overdue` directly (fresh load, not via in-app navigation).
- **Expected outcomes**: only overdue rows render (`status='lent'` AND `due_date < now`, UTC-consistent); future-due and already-returned loans are excluded; the filter control reflects the `overdue` selection from the URL.
- **Negative path**: with no overdue loans, the page renders an empty state (not an error); an unsupported `?status=` value falls back consistently (empty/error state, no crash).

### Journey: Auth guards and role enforcement
- **Steps**:
  1. While signed out, directly load `/books` (and `/loans`, `/books/:id`).
  2. Sign in as USER and directly load `/admin`.
  3. Sign out, sign in as ADMIN, load `/admin`.
- **Expected outcomes**: signed-out access to any guarded route redirects to `/login` (`RequireAuth`); USER hitting `/admin` is redirected/blocked (`RequireAdmin`); ADMIN sees the `/admin` user table populated from `GET /api/admin/users`; the admin nav section is visible only to ADMIN.
- **Negative path**: an expired/invalid stored token triggers a `401` on the first API call, which redirects the user to `/login` (api client behaviour); the admin table shows a loading state then data, or an error state on failure.

### Journey: SPA deep-link resolves in the production build
- **Steps**:
  1. Build the app and run the single Docker image (server serves the SPA `dist` + API on one port).
  2. Signed in, hard-load a deep link such as `/books/:id` and `/loans?status=lent` directly.
  3. From the browser, also issue an API request such as `GET /api/health`.
- **Expected outcomes**: deep links resolve to the SPA (`index.html` catch-all) and render the correct route; `/api/*` requests are handled by the API and are NOT swallowed by the SPA fallback (e.g. `GET /api/health` returns JSON `{"status":"ok"}`, not HTML).
- **Negative path**: an unknown non-`/api` path still serves the SPA shell (client renders its own not-found), while an unknown `/api/*` path returns a JSON `404`, not the SPA HTML.

---

## Data integrity tests
- **Users uniqueness**: `users.email` is UNIQUE; seeding twice (idempotent seed) does not create duplicate accounts nor error on re-boot.
- **Password storage**: `users.password_hash` is a bcrypt hash, never plaintext; it is never returned by any API (`/auth/login`, `/auth/me`, `/admin/users`).
- **Loan ownership**: every `loans` row has a `user_id`; `POST /api/loans` sets it to the creating user; USER-scoped queries never return rows with a different `user_id`.
- **Return transition**: after `POST /api/loans/:id/return`, the row has `status='returned'` AND a non-null `returned_at`; a `returned` loan is never reported as `overdue`.
- **Overdue derivation is not persisted**: `overdue` is computed at query time from `status='lent' AND due_date < now` (UTC); no `overdue` value is stored in the `status` column.
- **Referential validity**: `loans.book_id` refers to an existing `books.id` at creation time.
- **Schema bootstrap**: `CREATE TABLE IF NOT EXISTS` for `users`, `books`, `loans` is idempotent across restarts; `DATABASE_PATH` (default `./data/library.db`) is honoured.

## Seed contract tests
- Running the seed prints one `SEED_CRED ADMIN <email> <password>` line and one `SEED_CRED USER <email> <password>` line to stdout.
- Running the seed prints exactly one `SEED_CREDS_JSON <json-array>` line whose JSON parses to an array of `{ role, email, password }` objects covering both accounts.
- Logging in with each emitted credential via `POST /api/auth/login` succeeds and returns the matching `role`.
- Re-running the seed (or re-booting the container) is idempotent: no duplicate users, no error.

## Out of scope
- **`/signup` route and public registration** — the spec's Assumptions explicitly state "No `/signup`; accounts seeded only." Although `tasks.md` lists a signup route (from the full_auth auth model), the spec overrides it; not under test. Revisit only if the signup open question is resolved in favour of enabling it.
- **`GET/PATCH /api/admin/settings` and postgresql/minio service credentials** — these appear only in `tasks.md` (backing-services open question); the approved spec defines a single-image better-sqlite3 stack with no external DB/object store and no settings surface. Not under test until the open question is resolved.
- **`SystemSetting` entity** — tied to the admin-settings feature above; excluded for the same reason.
- **Token expiry/refresh semantics and password-reset flows** — the spec does not define token TTL, refresh, or reset; only "401 → redirect to /login" is asserted. Exact expiry timing is not tested.
- **Rate limiting, pagination, and sorting of list endpoints** — the spec is silent; lists are asserted for membership/scoping only, not ordering or paging.
- **Concurrency / multi-writer race conditions on loans** — not specified; single-writer behaviour assumed.
```
