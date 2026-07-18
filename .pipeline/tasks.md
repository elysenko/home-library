# Pipeline Task Decomposition

## Summary
Lending Ledger is a full-stack library lending app: a React + Vite + React Router SPA served by an Express + better-sqlite3 API, with JWT email/password auth and roles (ADMIN/USER), packaged as a single Docker image. Authenticated users share a books catalog and manage per-user loans (ADMIN sees all loans and a user list); loans derive an `overdue` state from `due_date`. The container seeds accounts on boot and serves the SPA + API on one port so deep links resolve in production.

## Surface contract
**API routes (Express, prefix `/api`)**
- `POST /api/auth/login` — email/password → `{ token, user }`.
- `GET /api/auth/me` — current user from Bearer JWT.
- `GET /api/books`, `POST /api/books` — list / create (auth required).
- `GET /api/books/:id`, `PUT /api/books/:id`, `DELETE /api/books/:id` — read/update/delete (auth required).
- `GET /api/loans?status=lent|returned|overdue|all` — list, USER scoped to own rows, ADMIN sees all.
- `POST /api/loans` — create loan (`book_id`, `borrower_name`, `due_date`).
- `POST /api/loans/:id/return` — set `status='returned'`, `returned_at`.
- `GET /api/admin/users` — ADMIN only.
- `GET /api/admin/settings`, `PATCH /api/admin/settings` — ADMIN only (service credentials).
- `GET /api/health` → `{ "status": "ok" }`.

**SPA routes (React Router)**
- `/login` (public), `/signup` (public — see Open questions).
- `/books`, `/books/:id`, `/loans` (reads `?status=`) — guarded by `RequireAuth`.
- `/admin`, `/admin/settings` — guarded by `RequireAdmin`.
- `/` → redirect `/books`.

**Entities**
- `users(id, email UNIQUE, password_hash, role, created_at)`.
- `books(id, title, author, genre, isbn, shelf_location, created_at)`.
- `loans(id, book_id, borrower_name, due_date, status, returned_at, user_id, created_at)`.
- `SystemSetting(key, value, updatedAt)`.

## db_agent tasks
- [ ] Create `server/src/db.ts`: better-sqlite3 connection; DB path from `DATABASE_PATH` env (default `./data/library.db`); bootstrap schema via `CREATE TABLE IF NOT EXISTS`.
- [ ] Define `users` table: `id`, `email UNIQUE`, `password_hash`, `role`, `created_at`. Role field uses enum values `ADMIN`/`USER` with default `USER` (full_auth model).
- [ ] Define `books` table: `id`, `title`, `author`, `genre`, `isbn`, `shelf_location`, `created_at`.
- [ ] Define `loans` table: `id`, `book_id`, `borrower_name`, `due_date`, `status`, `returned_at`, `user_id`, `created_at`; index `user_id` and `status` for scoped/filtered queries.
- [ ] Add `SystemSetting` table: `key` (primary key), `value`, `updatedAt` — backing store for admin-configured service credentials (postgresql, minio).
- [ ] Ensure `due_date`/`returned_at` timestamps stored as UTC for consistent `overdue` (`status='lent' AND due_date < now`) comparisons.

## backend_agent tasks
- [ ] Create `server/package.json` + `server/tsconfig.json`: Express, better-sqlite3, bcryptjs, jsonwebtoken, zod, cors, typescript, tsx; scripts `dev`, `build`, `start`, `seed`.
- [ ] Create `server/src/auth.ts`: `hashPassword`, `verifyPassword`, `signToken` (JWT via `JWT_SECRET` env, dev fallback constant), `authMiddleware` (Bearer JWT → `req.user`), `requireRole('ADMIN')` guard.
- [ ] Create `server/src/routes/auth.ts`: `POST /api/auth/login` (zod-validate creds → token + user), `GET /api/auth/me` (current user). First user gets `ADMIN`, subsequent users `USER` (full_auth); admin can always log in.
- [ ] Create `server/src/routes/books.ts`: CRUD `GET/POST /api/books`, `GET/PUT/DELETE /api/books/:id`, all behind `authMiddleware`; zod-validate create/update bodies.
- [ ] Create `server/src/routes/loans.ts`: `GET /api/loans?status=` with filter values `lent|returned|overdue|all` and role scoping (USER own rows, ADMIN all); `POST /api/loans`; `POST /api/loans/:id/return` sets `status='returned'` + `returned_at`. Derive `overdue` server-side.
- [ ] Create `server/src/routes/admin.ts`: `GET /api/admin/users` protected by `requireRole('ADMIN')`.
- [ ] Create `server/src/routes/health.ts`: `GET /api/health` → `{ "status": "ok" }`.
- [ ] Create `lib/config.ts`: `resolveConfig(key)` reads `process.env[key]` first; if absent or equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS`, reads `SystemSetting` DB row; returns null if neither set.
- [ ] Add admin settings endpoints: `GET /api/admin/settings` (list service keys for postgresql + minio with masked values + configured status) and `PATCH /api/admin/settings` (upsert key-value pairs, ADMIN role required).
- [ ] Create `server/src/app.ts`: Express app with JSON body parsing, CORS, mounted routers, static-serve of SPA build, and non-`/api` catch-all → `index.html` (order routes so `/api/*` is excluded from fallback).
- [ ] Create `server/src/index.ts`: start server on `PORT` (default 8080).
- [ ] Create `server/src/seed.ts`: idempotently upsert one ADMIN + one USER with known passwords; print `SEED_CRED <ROLE> <email> <password>` per account and one `SEED_CREDS_JSON <json-array>` line.

## ui_agent tasks
- [ ] Create `web/package.json`, `web/vite.config.ts` (dev proxy `/api`→backend), `web/tsconfig.json`, `web/index.html`, `web/src/main.tsx` (bootstrap `BrowserRouter`).
- [ ] Create `web/src/routes/AppRoutes.tsx`: route table — `/login` + `/signup` public; `/books`, `/books/:id`, `/loans` under `RequireAuth`; `/admin`, `/admin/settings` under `RequireAdmin`; `/` → redirect `/books`. Every navigable state URL-addressable (loan filter via `?status=`, detail via `:id`).
- [ ] Create `web/src/routes/Login.tsx` and `web/src/routes/Signup.tsx`: email/password forms (full_auth); handle validation + error states.
- [ ] Create `web/src/components/Layout.tsx`: nav + "Lending Ledger" dashboard heading; admin nav section visible only to admins.
- [ ] Create `web/src/routes/Books.tsx`: list with add/edit/delete; empty/loading/error states.
- [ ] Create `web/src/routes/BookDetail.tsx`: fetch by `:id`, fresh-reload safe; loading/not-found states.
- [ ] Create `web/src/routes/Loans.tsx`: list driven by URL `?status=` (`lent|returned|overdue|all`), log-loan form, mark-returned action; empty/loading/error states.
- [ ] Create `web/src/routes/Admin.tsx`: user table from `GET /api/admin/users`.
- [ ] Create `web/src/routes/AdminSettings.tsx` at `/admin/settings`: list postgresql + minio each with configured/unconfigured badge and per-service credential form.
- [ ] Wire loading/empty/error states consistently across all guarded pages.

## service_agent tasks
- [ ] Create `web/src/api.ts`: fetch wrapper injecting JWT from `localStorage`, attaching `Authorization: Bearer`, and redirecting to `/login` on 401.
- [ ] Create `web/src/auth/AuthContext.tsx`: token/user state, `login`, `logout`; loads `/api/auth/me` on mount.
- [ ] Create `web/src/auth/RequireAuth.tsx` and `web/src/auth/RequireAdmin.tsx`: guards redirecting signed-out/non-admin users to `/login`.
- [ ] Wire Books UI to `/api/books` CRUD endpoints (list, create, read, update, delete).
- [ ] Wire Loans UI to `/api/loans` (list with `status` query, create, `/:id/return`), keeping URL `?status=` as source of truth.
- [ ] Wire Admin UI to `/api/admin/users`, and Admin Settings UI to `GET/PATCH /api/admin/settings`.

## tester tasks
- [ ] Health check: `curl /api/health` → `200 {"status":"ok"}`.
- [ ] Seed check: run seed → assert `SEED_CRED` lines + exactly one `SEED_CREDS_JSON` line; log in as each account.
- [ ] Books happy path: add book via API/UI → appears in list and `/books/:id` renders on fresh reload; edit and delete round-trip.
- [ ] Loans lifecycle: create loan due next week → `status='lent'`; mark returned → `returned` with `returned_at`; persists across reload.
- [ ] Deep-link filter: open `/loans?status=overdue` directly → only overdue rows render (UTC-consistent).
- [ ] Auth/role coverage: signed-out load of `/books` → redirect `/login`; USER cannot reach `/admin`; ADMIN sees users list and `/admin/settings`.
- [ ] SPA fallback: deep link (e.g. `/books/:id`) resolves in production build; `/api/*` requests not swallowed by catch-all.

## Open questions
- **Signup conflict:** the full_auth auth model prescribes public `/login` + `/signup` with "first signup → ADMIN, later → USER", but the spec explicitly states *no `/signup`; accounts seeded only*. Tasks include `/signup` per the auth model — confirm whether signup should be enabled or removed to match the spec's seed-only intent.
- **Backing services vs. stack:** `<spec_deployments>` lists `postgresql` and `minio`, but the spec's data layer is better-sqlite3 (single Docker image, no external DB) and defines no object-storage/file feature. Admin settings tasks are included per the rules; confirm which services are actually used and which credential keys the settings page should expose.
- **Env key names:** no explicit env var keys were provided for postgresql/minio credentials; downstream agents should confirm the exact `SystemSetting` keys to surface in `GET /api/admin/settings`.
