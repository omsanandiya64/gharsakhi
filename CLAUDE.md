# CLAUDE.md — GharSakhi

> Rename this file to `CLAUDE.md` and keep it at the repo root.
> Claude Code reads it automatically at the start of every session.

## Project

GharSakhi is a two-sided domestic-help marketplace (customers ↔ workers, plus an admin).
The complete specification lives in **`02-GHARSAKHI-SPEC.md`** and is the source of truth.
Read it before changing anything structural.

## Stack — fixed, never substitute

React 18 + Vite + React Router + Tailwind CSS · Node 20 + Express 5 · **PostgreSQL 16**
with the `pg` driver and raw parameterised SQL · JWT + bcrypt · zod · Razorpay · web-push.

Plain JavaScript, ESM. No TypeScript. No ORM (no Prisma, Sequelize, Drizzle, TypeORM).
No MongoDB. No Next.js. No component library (no MUI, Chakra, Ant, shadcn).

## Commands

```bash
# backend
cd server && npm run dev        # nodemon on :4000
cd server && npm run migrate    # apply migrations in order
cd server && npm run seed       # reset + load demo data
cd server && npm run gen:vapid  # print a VAPID key pair

# frontend
cd client && npm run dev        # vite on :5173
cd client && npm run build
```

Database: `postgresql://postgres:postgres@localhost:5432/gharsakhi`

## Non-negotiable rules

1. **Money is integer paise.** Never floats, never `NUMERIC` for balances, never client-side
   arithmetic on price. One helper, `formatMoney(paise)`, does all display formatting.
2. **Commission = 20%.** `commission = floor(price * 0.20)`, `worker_earning = price - commission`.
   Compute commission first so the two always sum to the price exactly.
3. **Every money movement runs in a database transaction** with `SELECT ... FOR UPDATE` on the
   wallet row, `BEGIN/COMMIT/ROLLBACK`, and `client.release()` in a `finally` block.
   Every movement also writes a `wallet_transactions` row. No exceptions.
4. **Guard every status transition.** Assert the current status before changing it. Return
   `409 INVALID_TRANSITION` otherwise. No double-accept, no complete-before-accept, no
   decline-after-accept, no second review.
5. **All SQL parameterised.** `$1, $2` only. Never string concatenation, never template
   literals with user input.
6. **Authorisation on every route.** Verify the resource belongs to the caller before
   returning or mutating it. Admin routes use `adminAuth`, never plain `auth`.
7. **The app must run with no third-party keys.** Missing Razorpay or VAPID config logs a
   warning and disables that route — it never crashes the server.
8. **Never log or return `password_hash`.**

## Design rules

Palette: teal `#0B3D3B` / `#14807C` / `#DCEFED`, marigold `#F2A007`, sand `#FBF8F3`,
ink `#14211F`, online-green `#22A45D`, danger `#D64545`. Use the CSS variables in
`client/src/tokens.css` — no hardcoded hex in components.

Fonts: **Baloo Bhai 2** (display, chosen for its Gujarati script support), **Inter** (UI),
**IBM Plex Mono** (money and IDs).

Accessibility is a requirement, not a nice-to-have — many workers have limited literacy:
- every service has its own icon at ≥40px, always with its label
- online status = pulsing green ring (honour `prefers-reduced-motion`)
- accept/decline = ≥64px icon buttons, never text-only
- 48px minimum touch target, visible focus rings, status shown by icon + colour + text

Mobile-first. Bottom tab bar under 768px, sidebar at 1024px and above. No horizontal
scrolling at 375px — admin tables become stacked cards on mobile.

## Code structure

- Business logic in `server/src/services/`. Route files only parse, call, and respond.
- Every handler wrapped in `asyncHandler`. Central error middleware formats all errors as
  `{ error: { code, message } }`.
- Every request body validated with zod before it reaches the database.
- Error codes defined once in `server/src/utils/errors.js`.
- React components stay under 200 lines — extract when longer.
- Every list UI has three states: loading skeleton, empty state with an action, error state
  with retry. Never a blank screen.

## Working style

- **Build one phase at a time** (see §11 of the spec). Stop after each phase, run the
  verification step, commit, and wait for approval.
- Do not add features that are not in the spec. If something seems missing, ask.
- If you make a judgement call, record it in `DECISIONS.md` with one line of reasoning.
- Prefer editing existing files over creating new ones.
- Do not create documentation files unless asked.
