# Decisions

One line each. Judgement calls made while building, and why.

- Phase 0: Repo root is `d:/GharShakhi` itself (already contained the spec docs), not a nested `gharsakhi/` folder — matches where the user pointed Claude Code.
- Phase 0: Pinned `tailwindcss` to `^3.4.0` explicitly in `client/package.json` — a bare install today would pull v4, but the spec fixes Tailwind v3.
- Phase 0: Proceeding on the installed Node v24 and PostgreSQL 18 rather than the spec's pinned Node 20 / Postgres 16 — user confirmed Postgres 18 is fine; Node 24 is backwards compatible with everything in the fixed stack (Express 5, pg, etc.).
- Phase 0: `server/.env` is created locally (git-ignored) from `.env.example` with a placeholder DB password for the user to fill in; only `.env.example` is committed.
- Phase 1: Split §5.2's table list across migrations by feature: `001_init.sql` has every core table plus `payment_orders` (no dedicated file was named for it), `002_indexes.sql` has all 8 indexes, `003_push.sql` has only `push_subscriptions` — matching the three filenames the spec's repo layout names.
- Phase 1: Migration idempotency is enforced via a `schema_migrations` tracking table (filename + applied_at), not idempotent SQL bodies — Postgres has no `CREATE TYPE IF NOT EXISTS`, so re-running a migration body isn't safe; skipping already-applied files is.
- Phase 1: Added `server/src/utils/money.js` (`splitPrice`) a phase early so seed.js and the Phase 3 booking service share one commission-split implementation instead of duplicating the formula.
- Phase 1: `seed.js` wraps everything in one transaction (`TRUNCATE ... RESTART IDENTITY CASCADE` then re-insert) so a failed reseed never leaves partial data; this is a one-off data loader, not a concurrent code path, so it doesn't need the `SELECT ... FOR UPDATE` locking that live money movements require.
- Phase 1: Caught during seeding — two customers' seeded bookings initially summed to more debits than their ₹2000 starting wallet, which would be impossible under the real `402 INSUFFICIENT_BALANCE` rule. Rebalanced the seeded booking price mix per customer so cumulative holds never exceed the starting balance at any point in the chronological sequence; `seed.js`'s reconciliation report now also asserts customer balances are non-negative.
- Phase 1: Added `004_balance_constraints.sql` — DB-level `CHECK (wallet_paise >= 0)` on both `customers` and `workers`, at the user's request, as defense-in-depth: the seed assertion only catches bad seed data, this makes a negative balance impossible from any code path, including a future buggy Phase 3 transaction. Verified live by attempting a direct negative `UPDATE`, which Postgres rejected.
