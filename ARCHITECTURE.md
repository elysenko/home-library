# Architecture

## Stack
Requested stack: `react-express` (fixed by the platform).

Scaffolded from `template-react-express` — a Vite + React Router SPA (`web/`) served by an Express + Prisma API (`backend/`), designed to build into a single deployable pair of images (frontend nginx image + backend API image).

Note: the plan called for `better-sqlite3` directly; the fixed platform template instead wires up Prisma (with a SQLite/Postgres-capable schema) as its ORM layer. Implement the plan's features (auth, books CRUD, loans, admin) on top of this template's Express + Prisma stack rather than swapping in a different persistence library.

## Status
- **Newly scaffolded**: this project directory was empty aside from `README.md` and `.github/workflows/colossus-deploy.yml`. `web/` and `backend/` did not exist before this run.

## Layout
- `backend/` — Express API, entry `backend/src/server.ts`, app wiring `backend/src/app.ts`, auth helpers `backend/src/lib/auth.ts`, Prisma client `backend/src/lib/prisma.ts`, schema `backend/prisma/schema.prisma`, seed script `backend/prisma/seed.ts`. Has its own `Dockerfile`.
- `web/` — Vite React Router SPA, entry `web/src/main.tsx`, routes in `web/src/App.tsx` (`/`, `/login`), pages in `web/src/pages/`. Dev server proxies `/api` to the backend (`web/vite.config.ts`). Has `Dockerfile.frontend` + `nginx.conf` for the static build.
- `.pipeline/surface.json` — contract listing routes, components, and `data-testid`s for downstream test generation. Currently reflects only the template stub (`/api/health`, `/api/auth/login`, `App`, `Home`) — the coder agent must extend it as real routes/components/pages are added (books, loans, admin, etc. per the plan).
- `colossus.yaml` — build manifest read by deploy agents (framework: react, backend: express).
- `.colossus-acceptance.json` — acceptance contract for the post-deploy render gate; `expect_text` is intentionally empty and must be filled in by the coder once the real front page content (e.g. "Lending Ledger" heading) is implemented.

## Next steps for the developer / coder agent
1. Implement the plan's backend routes (`auth`, `books`, `loans`, `admin`, `health`) inside `backend/src/`, adapting the existing Prisma-based scaffold rather than introducing `better-sqlite3`.
2. Update `backend/prisma/schema.prisma` with `User`, `Book`, `Loan` models per the plan; run `npx prisma migrate dev` (or `db push`) locally, and keep `backend/prisma/seed.ts` idempotent, emitting `SEED_CRED` / `SEED_CREDS_JSON` lines.
3. Build out the frontend pages (`Books`, `BookDetail`, `Loans`, `Admin`) and routing/guards in `web/src/`, replacing the stub `App.tsx`/`Home.tsx`/`Login.tsx` while preserving `data-testid="app-ready"` on the shell root.
4. Regenerate `.pipeline/surface.json` to list every real route, component, and `data-testid` as they're added.
5. Fill in `.colossus-acceptance.json`'s `expect_text` with real front-page substrings once the dashboard UI exists.
6. Copy `backend/.env.template` to `backend/.env` if/when one is added, and configure `DATABASE_URL`/`JWT_SECRET` for local runs.
7. Run `docker build` against `backend/Dockerfile` and `web/Dockerfile.frontend` to validate the container images before deploy.

## Template source
- `template-react-express` from the scaffold-templates library.
