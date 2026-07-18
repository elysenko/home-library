# Home Library — Lending Ledger

A household book catalog & loan tracker. React + Vite SPA (`web/`) served by an
Express + Prisma API (`backend/`) over PostgreSQL, deployed as a frontend nginx
image + backend API image.

## Features
- Email/password auth with JWT and `ADMIN` / `USER` roles.
- Books catalog: add, view, edit, delete (each book deep-linkable at `/books/:id`).
- Loans: log who borrowed a book and when it's due; mark returned. Filter by
  status straight from the URL (`/loans?status=lent|overdue|returned|all`).
  Regular users see only their own loans; admins see all.
- Admin members roster (`/admin`) and service settings (`/admin/settings`).

## Layout
- `backend/` — Express API. Entry `src/server.ts`, routes in `src/routes/`,
  Prisma schema `prisma/schema.prisma`, seed `prisma/seed.ts`.
- `web/` — Vite React SPA. Routes in `src/routes/AppRoutes.tsx`; the API client
  lives in `src/lib/api.ts` + `src/lib/store.ts`.

## Environment
Set on the backend (injected from `infra-secrets` in deploy):
- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — token signing secret.
- `PORT` — API port (default `3000`).

## Local development
```bash
# Backend (terminal 1)
cd backend
npm install
export DATABASE_URL="postgresql://user:pass@localhost:5432/app"
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma db seed          # prints SEED_CRED lines
npm run dev                 # API on :3000

# Frontend (terminal 2)
cd web
npm install
npm run dev                 # SPA on :5173, proxies /api -> :3000
```

## Seeded demo accounts
The seed prints one `SEED_CRED <ROLE> <email> <password>` line per demo account
plus a single `SEED_CREDS_JSON` line:
- **admin** — `admin@library.local` / `admin1234`
- **user** — `reader@library.local` / `reader1234`

## Deploy
Multi-stage Docker builds: `backend/Dockerfile` (runs `prisma migrate deploy`
then `prisma db seed`, then starts the API) and `web/Dockerfile.frontend`
(builds the SPA into nginx, which serves it and proxies `/api/` to the backend).
