# GharSakhi

Two-sided domestic-help marketplace. React + Vite frontend, Node + Express backend,
PostgreSQL (raw SQL via `pg`, no ORM). Full spec: `02-GHARSAKHI-SPEC.md`.

## Setup

### Prerequisites
- Node.js 20+ (developed against Node 24, backwards compatible)
- PostgreSQL running locally, with a database named `gharsakhi` already created

### Backend

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL with your real Postgres password
npm run migrate         # applies 001_init, 002_indexes, 003_push (safe to re-run)
npm run seed            # wipes and reloads all demo data (safe to re-run)
npm run dev             # http://localhost:4000
```

### Frontend

```bash
cd client
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

### Verify

- Backend: `curl http://localhost:4000/api/health` → `{"status":"ok"}`
- Frontend: open http://localhost:5173 — should show the GharSakhi scaffold page.

## Project status

Building phase by phase per §11 of the spec. See `DECISIONS.md` for judgement calls
made along the way.
