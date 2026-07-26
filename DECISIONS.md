# Decisions

One line each. Judgement calls made while building, and why.

- Phase 0: Repo root is `d:/GharShakhi` itself (already contained the spec docs), not a nested `gharsakhi/` folder — matches where the user pointed Claude Code.
- Phase 0: Pinned `tailwindcss` to `^3.4.0` explicitly in `client/package.json` — a bare install today would pull v4, but the spec fixes Tailwind v3.
- Phase 0: Proceeding on the installed Node v24 and PostgreSQL 18 rather than the spec's pinned Node 20 / Postgres 16 — user confirmed Postgres 18 is fine; Node 24 is backwards compatible with everything in the fixed stack (Express 5, pg, etc.).
- Phase 0: `server/.env` is created locally (git-ignored) from `.env.example` with a placeholder DB password for the user to fill in; only `.env.example` is committed.
