# How to use this package

1. Make an empty folder and open it in Claude Code:
   ```bash
   mkdir gharsakhi && cd gharsakhi
   claude
   ```
2. Copy `02-GHARSAKHI-SPEC.md` and `03-CLAUDE.md` into that folder.
   Rename `03-CLAUDE.md` to `CLAUDE.md`.
3. Make sure PostgreSQL 16 is running and create the database:
   ```bash
   createdb gharsakhi
   ```
4. Paste **Prompt 1** below into Claude Code. Then work phase by phase using **Prompt 2**.

---

## Prompt 1 — kickoff (paste this first)

```
Read 02-GHARSAKHI-SPEC.md and CLAUDE.md completely before writing any code.

We are building GharSakhi, a two-sided domestic-help marketplace: React + Vite frontend,
Node + Express backend, PostgreSQL database. The spec is the source of truth for the
schema, the API, the money rules, and the design system. Follow it exactly.

Do this now, and only this:

1. Confirm you have read both files by summarising, in under 15 lines:
   - the three roles and what each can do
   - the escrow money flow (create / decline / complete)
   - the 12 phases in the build order
2. List any place where the spec is ambiguous or where you disagree with a decision.
   Do not silently change anything — ask me.
3. Check my environment: node version, npm version, and whether `psql` and PostgreSQL 16
   are available and the `gharsakhi` database exists. Report what you find.
4. Then build Phase 0 (Scaffold) only. Stop after Phase 0 and tell me how to run it.

Do not start Phase 1 until I say so.
```

---

## Prompt 2 — advance one phase (reuse for each phase)

```
Phase <N> is approved. Build Phase <N+1> from the spec.

Before you start: re-read the relevant section of 02-GHARSAKHI-SPEC.md.
After you finish: run it, show me the verification step listed for that phase in §11,
update DECISIONS.md with anything you decided, and git commit.
Then stop and wait for me.
```

---

## Prompt 3 — the critical one, use before approving Phase 3

Phase 3 is the money engine. Do not wave it through.

```
Before I approve Phase 3, prove the escrow logic:

1. Write a script `server/tests/smoke-booking.js` that, against a freshly seeded database:
   - records the customer, worker, and platform balances
   - creates a booking, asserts the customer was debited the full price
   - declines it, asserts the customer is back to the original balance exactly
   - creates a second booking, accepts it, completes it
   - asserts worker +80%, platform +20%, and that 80% + 20% == price with no rounding loss
   - asserts a second complete on the same booking is rejected with 409
2. Run it and show me the output.
3. Show me the SQL of the create-booking transaction so I can read it myself.
```

---

## Prompt 4 — quality gate at the end

```
Run the full acceptance checklist in §12 of the spec. For each item, either show me proof
that it passes or tell me it fails. Fix everything that fails. Do not mark an item as
passing without actually testing it.

Then check the app at 375px, 768px, and 1440px and fix any layout breakage.
```

---

## Things to tell Claude Code when you hit trouble

| Situation | What to say |
|---|---|
| It invented a feature you didn't ask for | "That is not in the spec. Remove it and re-read §<n>." |
| It used an ORM / TypeScript / a different DB | "The stack in §2 is fixed. Redo this with `pg` and raw SQL." |
| Money numbers look wrong | "Show me every wallet_transactions row for booking <id> and reconcile it against the spec's §7.3." |
| It built everything at once | "Revert to the last commit. Build one phase at a time as §11 requires." |
| UI looks generic | "Re-read §4. Apply the actual teal/marigold tokens and Baloo Bhai 2 / Inter / IBM Plex Mono. No default blue-and-grey." |

---

## Later: coming back for changes

When you return to me (Claude in chat) for changes, bring:
- what you want changed, in plain words
- the file(s) involved, or a screenshot
- any error message in full

I'll write you a precise change prompt to paste back into Claude Code, so the two of us
stay in sync on the same spec.
