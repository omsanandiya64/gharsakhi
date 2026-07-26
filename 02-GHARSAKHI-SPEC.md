# GharSakhi — Full Technical Specification

> Hand this file to Claude Code as the single source of truth. Everything below is a
> requirement unless marked *(optional)*. If something is ambiguous, pick the simpler
> option and write the decision into `DECISIONS.md`.

---

## 1. What we are building

GharSakhi ("Ghar" = home, "Sakhi" = companion) is a two-sided marketplace connecting
households with verified domestic workers (*bai*) for cleaning and home-care services.
Three roles: **Customer**, **Worker**, **Admin**.

The platform sits in the middle and handles: area+skill matching, live availability,
escrow payments, 20% commission, ratings, and moderation.

**Non-goals for v1:** chat between customer and worker, scheduling recurring bookings,
worker background-check document upload, multi-city support, mobile native apps.

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Styling | Tailwind CSS v3 + a small `tokens.css` for CSS variables |
| Icons | `lucide-react` |
| HTTP client | `axios` with a single configured instance |
| Backend | Node.js 20 + Express 5 |
| Database | **PostgreSQL 16** (required) |
| DB driver | `pg` (node-postgres) with a connection `Pool` — raw SQL, no ORM |
| Migrations | plain numbered `.sql` files + a small `npm run migrate` runner |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` (10 rounds) |
| Validation | `zod` on every request body |
| Payments | Razorpay (`razorpay` npm package) |
| Push | `web-push` (VAPID) |
| Logging | `morgan` in dev |
| Env | `dotenv` |

No TypeScript. Plain JavaScript with ESM (`"type": "module"`) on both sides.

---

## 3. Repository layout

```
gharsakhi/
├── CLAUDE.md
├── README.md
├── DECISIONS.md
├── .gitignore
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── tokens.css
│       ├── api/            # axios instance + one file per resource
│       ├── auth/           # AuthContext, useAuth, ProtectedRoute
│       ├── components/     # shared UI (Button, Card, Modal, StatusPill, ...)
│       ├── layouts/        # CustomerLayout, WorkerLayout, AdminLayout
│       ├── pages/
│       │   ├── public/     # Landing, RoleSelect, Login, Register
│       │   ├── customer/
│       │   ├── worker/
│       │   └── admin/
│       └── lib/            # formatMoney, formatDate, usePolling
└── server/
    ├── package.json
    ├── .env.example
    ├── src/
    │   ├── index.js         # express app bootstrap
    │   ├── db/
    │   │   ├── pool.js
    │   │   ├── migrate.js
    │   │   ├── seed.js
    │   │   └── migrations/
    │   │       ├── 001_init.sql
    │   │       ├── 002_indexes.sql
    │   │       └── 003_push.sql
    │   ├── middleware/      # auth.js, adminAuth.js, error.js, validate.js
    │   ├── routes/          # auth, customer, worker, admin, booking, wallet, payment, push
    │   ├── services/        # bookingService.js, walletService.js, pushService.js
    │   └── utils/           # money.js, jwt.js, asyncHandler.js
    └── tests/               # optional smoke tests
```

---

## 4. Design system

### 4.1 Palette (CSS variables in `tokens.css`)

| Token | Hex | Use |
|---|---|---|
| `--gs-teal-900` | `#0B3D3B` | headings, dark surfaces, nav |
| `--gs-teal-600` | `#14807C` | primary buttons, links, active state |
| `--gs-teal-100` | `#DCEFED` | soft chips, selected backgrounds |
| `--gs-marigold` | `#F2A007` | accent, price, worker CTA, highlights |
| `--gs-marigold-100` | `#FDF0D6` | accent backgrounds |
| `--gs-sand` | `#FBF8F3` | page background |
| `--gs-ink` | `#14211F` | body text |
| `--gs-muted` | `#6B7B79` | secondary text |
| `--gs-online` | `#22A45D` | online ring, completed status |
| `--gs-danger` | `#D64545` | decline, block, errors |

Mirror these into `tailwind.config.js` as `theme.extend.colors.gs.*` so classes like
`bg-gs-teal-600` work.

### 4.2 Typography

- **Display / headings:** `Baloo Bhai 2` (Google Fonts) — chosen because it carries
  native Gujarati script support, matching the project's regional roots. Weights 600, 700.
- **Body / UI:** `Inter`, weights 400, 500, 600.
- **Numbers / IDs / money:** `IBM Plex Mono` 500 — makes wallet amounts and booking IDs
  scannable and prevents digits from shifting width as they change.

Type scale: `12 / 14 / 16 / 20 / 26 / 34 / 44` px.

### 4.3 Accessibility-first rules (hard requirements)

Many workers may have limited literacy. Therefore:

1. Every one of the 12 services has a **distinct lucide icon** shown at ≥40px, always
   paired with its label.
2. Worker online status is a **pulsing green ring** around the avatar — animated, not
   just a text label. Respect `prefers-reduced-motion` (ring stays solid, stops pulsing).
3. Accept / Decline are **large icon buttons ≥64×64px**, green check and red cross,
   with the text label underneath — never text-only.
4. Minimum touch target everywhere: **48×48px**.
5. Status is always encoded by **icon + colour + text**, never colour alone.
6. Visible keyboard focus ring on every interactive element (`outline` 2px teal-600).
7. Every image and icon button has an `aria-label`.
8. Body text never below 14px; primary content 16px.

### 4.4 Responsive

Mobile-first. Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`.

- **Mobile (<768px):** bottom tab bar (3–4 tabs per role), full-width cards, single column,
  sticky action bar for booking confirmation.
- **Tablet (768–1024):** two-column service grid, bottom bar becomes top bar.
- **Desktop (≥1024):** left sidebar navigation, 3-column service grid, admin tables show
  all columns. Max content width 1200px, centered.

Admin tables on mobile collapse into stacked cards — never a horizontally scrolling table.

---

## 5. Data model (PostgreSQL)

All money is stored as **integer paise** (`₹499.00` → `49900`). Never use floats for money.

### 5.1 Enums

```sql
CREATE TYPE booking_status AS ENUM ('pending','accepted','declined','completed','cancelled');
CREATE TYPE actor_type     AS ENUM ('customer','worker','platform');
CREATE TYPE txn_type        AS ENUM ('topup','hold','refund','earning','commission');
```

### 5.2 Tables

```sql
CREATE TABLE services (
  id           SERIAL PRIMARY KEY,
  code         TEXT UNIQUE NOT NULL,       -- 'bathroom_cleaning'
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,              -- lucide icon name
  price_paise  INTEGER NOT NULL CHECK (price_paise > 0),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE areas (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  city  TEXT NOT NULL DEFAULT 'Ahmedabad',
  UNIQUE (name, city)
);

CREATE TABLE customers (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT UNIQUE NOT NULL,
  email          TEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  address_text   TEXT,
  area_id        INTEGER REFERENCES areas(id),
  wallet_paise   INTEGER NOT NULL DEFAULT 200000,   -- ₹2000 starting balance
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT UNIQUE NOT NULL,
  email          TEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  photo_url      TEXT,
  bio            TEXT,
  is_online      BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  wallet_paise   INTEGER NOT NULL DEFAULT 0,
  rating_avg     NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE worker_services (
  worker_id  INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, service_id)
);

CREATE TABLE worker_areas (
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  area_id   INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_id, area_id)
);

CREATE TABLE bookings (
  id                   SERIAL PRIMARY KEY,
  customer_id          INTEGER NOT NULL REFERENCES customers(id),
  worker_id            INTEGER NOT NULL REFERENCES workers(id),
  service_id           INTEGER NOT NULL REFERENCES services(id),
  area_id              INTEGER NOT NULL REFERENCES areas(id),
  address_text         TEXT NOT NULL,
  scheduled_for        TIMESTAMPTZ,
  status               booking_status NOT NULL DEFAULT 'pending',
  price_paise          INTEGER NOT NULL,      -- snapshot at booking time
  worker_earning_paise INTEGER NOT NULL,      -- 80%
  commission_paise     INTEGER NOT NULL,      -- 20%
  decline_reason       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at          TIMESTAMPTZ,
  declined_at          TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ
);

CREATE TABLE wallet_transactions (
  id                 SERIAL PRIMARY KEY,
  actor              actor_type NOT NULL,
  actor_id           INTEGER,               -- NULL when actor='platform'
  booking_id         INTEGER REFERENCES bookings(id),
  type               txn_type NOT NULL,
  amount_paise       INTEGER NOT NULL,      -- signed: negative = money out
  balance_after_paise INTEGER,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER UNIQUE NOT NULL REFERENCES bookings(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  worker_id   INTEGER NOT NULL REFERENCES workers(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE push_subscriptions (
  id         SERIAL PRIMARY KEY,
  actor      actor_type NOT NULL,
  actor_id   INTEGER NOT NULL,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_orders (
  id                  SERIAL PRIMARY KEY,
  customer_id         INTEGER NOT NULL REFERENCES customers(id),
  razorpay_order_id   TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  amount_paise        INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'created',  -- created | paid | failed
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 Indexes (migration 002)

```sql
CREATE INDEX idx_bookings_customer  ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_bookings_worker    ON bookings(worker_id, created_at DESC);
CREATE INDEX idx_bookings_status    ON bookings(status);
CREATE INDEX idx_bookings_service   ON bookings(service_id);
CREATE INDEX idx_wtx_actor          ON wallet_transactions(actor, actor_id, created_at DESC);
CREATE INDEX idx_workers_online     ON workers(is_online) WHERE is_blocked = FALSE;
CREATE INDEX idx_worker_areas_area  ON worker_areas(area_id);
CREATE INDEX idx_reviews_worker     ON reviews(worker_id);
```

---

## 6. Seed data

### 6.1 The 12 services

| code | name | lucide icon | price (₹) |
|---|---|---|---|
| `bathroom_cleaning` | Bathroom Cleaning | `ShowerHead` | 349 |
| `kitchen_cleaning` | Kitchen Cleaning | `CookingPot` | 449 |
| `full_home_cleaning` | Full Home Cleaning | `Home` | 1299 |
| `sofa_carpet_cleaning` | Sofa & Carpet Cleaning | `Sofa` | 899 |
| `utensils_washing` | Utensils Washing | `Utensils` | 199 |
| `laundry_ironing` | Laundry & Ironing | `Shirt` | 299 |
| `cooking` | Cooking | `ChefHat` | 599 |
| `baby_elder_care` | Baby & Elder Care | `HeartHandshake` | 799 |
| `gardening` | Gardening | `Sprout` | 499 |
| `pest_control` | Pest Control | `Bug` | 1499 |
| `car_washing` | Car Washing | `Car` | 349 |
| `office_cleaning` | Office Cleaning | `Building2` | 1099 |

### 6.2 Areas (Ahmedabad)

Satellite, Bopal, Vastrapur, Navrangpura, Maninagar, Chandkheda, Gota, Thaltej,
Prahlad Nagar, Naranpura, S.G. Highway, Nikol.

### 6.3 Demo accounts

- 8 workers with mixed service sets, areas, and some pre-seeded reviews so ratings aren't 0.
- 3 customers.
- 1 admin: username `admin`, password `admin@123`.
- ~15 bookings across all statuses so the admin dashboard and history filters have data.

All seeded passwords: `password123` (print them in the seed output).

---

## 7. Business logic (the part that must be exactly right)

### 7.1 Money split

```
commission_paise     = floor(price_paise * 0.20)
worker_earning_paise = price_paise - commission_paise
```

Compute the commission first and give the remainder to the worker, so the two always sum
to the price with no rounding leak.

### 7.2 Booking lifecycle

```
                 ┌──────── decline ────────► DECLINED   (customer refunded)
                 │
CREATE ──► PENDING ──► accept ──► ACCEPTED ──► complete ──► COMPLETED
                 │                     │                      │
                 └──── cancel ─────────┘                      └──► review (once)
                        (customer, before accept only)
                        CANCELLED  → refunded
```

### 7.3 Escrow rules — each of these runs in a **single database transaction**

**Create booking** (`POST /api/bookings`)
1. `BEGIN`
2. `SELECT ... FROM customers WHERE id=$1 FOR UPDATE` — lock the row.
3. Reject if `is_blocked`, or if `wallet_paise < price_paise` (`402 INSUFFICIENT_BALANCE`).
4. Re-verify the worker: online, not blocked, offers this service, covers this area.
   If not → `409 WORKER_UNAVAILABLE`.
5. Debit customer wallet by `price_paise`.
6. Insert booking with `status='pending'` and the money split snapshot.
7. Insert `wallet_transactions` row: actor `customer`, type `hold`, amount `-price_paise`.
8. `COMMIT` → then send push to worker (outside the transaction).

**Worker declines**
1. `BEGIN`, lock booking `FOR UPDATE`, assert `status='pending'`.
2. Set `status='declined'`, `declined_at=now()`, store reason.
3. Credit customer wallet `+price_paise`, insert `refund` transaction.
4. `COMMIT` → push to customer.

**Worker accepts** — status change only, no money moves. Assert `status='pending'`.

**Job completed** (worker marks complete)
1. `BEGIN`, lock booking, assert `status='accepted'`.
2. Set `status='completed'`, `completed_at=now()`.
3. Credit worker `+worker_earning_paise`, insert `earning` transaction.
4. Insert `commission` transaction for actor `platform` (`+commission_paise`, `actor_id` NULL).
5. `COMMIT` → push to customer asking for a rating.

**Customer cancels** — only allowed while `status='pending'`. Same refund path as decline.

**Rating** — only on a `completed` booking, only by the owning customer, only once
(enforced by the `UNIQUE` on `reviews.booking_id`). After insert, recompute in the same
transaction:
```sql
UPDATE workers w
SET rating_count = sub.c, rating_avg = sub.a
FROM (SELECT COUNT(*) c, ROUND(AVG(rating),2) a FROM reviews WHERE worker_id=$1) sub
WHERE w.id = $1;
```

**Rule:** every status transition must be guarded by an assertion on the current status.
Never allow accept→accept, complete→complete, or decline after accept. Return
`409 INVALID_TRANSITION` otherwise.

### 7.4 Matching query

Customer picks a service + area → return workers where:
`is_online = TRUE AND is_blocked = FALSE` AND has that service in `worker_services`
AND has that area in `worker_areas`. Sort by `rating_avg DESC, rating_count DESC`.

### 7.5 Blocked accounts

A blocked customer or worker: can log in but every write endpoint returns
`403 ACCOUNT_BLOCKED`, and blocked workers are excluded from matching and forced offline.

---

## 8. REST API

Base: `/api`. All responses JSON. Errors:
`{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "human readable" } }`.

Auth header: `Authorization: Bearer <jwt>`. JWT payload: `{ id, role, iat, exp }` where
role is `customer` | `worker` | `admin`. Expiry 7 days.

### Public
| Method | Path | Notes |
|---|---|---|
| GET | `/api/services` | 12 services |
| GET | `/api/areas` | area list |
| POST | `/api/auth/customer/register` | name, phone, email, password, area_id, address |
| POST | `/api/auth/customer/login` | phone + password |
| POST | `/api/auth/worker/register` | + service_ids[], area_ids[] |
| POST | `/api/auth/worker/login` | |
| POST | `/api/auth/admin/login` | username + password |

### Customer (role: customer)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/customer/me` | profile + wallet |
| PATCH | `/api/customer/me` | name, address, area |
| GET | `/api/customer/workers?service_id=&area_id=` | matching workers |
| GET | `/api/customer/workers/:id` | profile + last 5 reviews |
| POST | `/api/bookings` | `{service_id, worker_id, area_id, address_text, scheduled_for}` |
| GET | `/api/customer/bookings?status=&service_id=&from=&to=&page=` | filtered history |
| GET | `/api/customer/bookings/:id` | detail |
| POST | `/api/customer/bookings/:id/cancel` | pending only |
| POST | `/api/customer/bookings/:id/review` | `{rating, comment}` |
| GET | `/api/customer/wallet` | balance + transactions |
| GET | `/api/customer/updates?since=` | **polling**: status changes since timestamp |

### Worker (role: worker)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/worker/me` | profile, wallet, rating, services, areas |
| PATCH | `/api/worker/me` | name, bio, photo |
| PATCH | `/api/worker/availability` | `{is_online: bool}` |
| PUT | `/api/worker/services` | `{service_ids: []}` |
| PUT | `/api/worker/areas` | `{area_ids: []}` |
| GET | `/api/worker/requests` | **polling**: pending bookings for me |
| POST | `/api/worker/bookings/:id/accept` | |
| POST | `/api/worker/bookings/:id/decline` | `{reason}` |
| POST | `/api/worker/bookings/:id/complete` | |
| GET | `/api/worker/bookings?status=&service_id=&from=&to=&page=` | history |
| GET | `/api/worker/wallet` | earnings + transactions |
| GET | `/api/worker/reviews` | reviews received |

### Admin (role: admin — separate middleware `adminAuth`)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/stats` | totals: customers, workers, online workers, bookings by status, GMV, commission earned |
| GET | `/api/admin/bookings?status=&from=&to=&page=` | all bookings |
| GET | `/api/admin/customers?q=&page=` | |
| GET | `/api/admin/workers?q=&page=` | |
| PATCH | `/api/admin/customers/:id/block` | `{is_blocked: bool}` |
| PATCH | `/api/admin/workers/:id/block` | `{is_blocked: bool}` |
| GET | `/api/admin/transactions?page=` | wallet ledger |

### Payments
| Method | Path | Notes |
|---|---|---|
| POST | `/api/payments/order` | `{amount_paise}` → creates Razorpay order, stores in `payment_orders` |
| POST | `/api/payments/verify` | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` |

Verification: HMAC-SHA256 of `order_id + "|" + payment_id` with `RAZORPAY_KEY_SECRET`,
compared using `crypto.timingSafeEqual`. On success, in one transaction: mark order paid,
credit the customer wallet, insert a `topup` transaction. **Reject replays** — if the order
is already `paid`, return `409`.

### Push
| Method | Path | Notes |
|---|---|---|
| GET | `/api/push/public-key` | VAPID public key |
| POST | `/api/push/subscribe` | store subscription for the logged-in actor |
| DELETE | `/api/push/subscribe` | remove |

Push events: new job → worker; accepted / declined / completed → customer.
Push failures must never break the API response — catch and log, always fire-and-forget.

### Polling
Frontend polls every **5 seconds** while the relevant screen is open, using the `?since=`
timestamp so responses stay small. Stop polling when the tab is hidden
(`document.visibilityState`). Do not poll on history or profile screens.

---

## 9. Frontend screens

### Public
- **Landing** — hero explaining GharSakhi, the 12 services as an icon grid, "how it works"
  in 3 steps, and two big entry buttons: *I need help at home* / *I want to work*.
- **Role select → Login / Register** (separate forms for customer and worker).
- Admin login lives at `/admin/login`, not linked from the landing page.

### Customer panel
1. **Home** — wallet balance card, service catalogue grid (12 icons), active booking banner.
2. **Choose area** → **Available workers now** — cards with photo, pulsing online ring,
   rating, jobs done, price. Empty state: "No one is online in {area} for {service} right
   now. Try another area or check back shortly."
3. **Booking confirm** — service, worker, price, wallet before/after, address field, confirm.
4. **My bookings** — filters: status, service, date range. Status pill on every row.
5. **Booking detail** — timeline of the booking, cancel button (pending only), rate button
   (completed, unrated only).
6. **Rate worker** — 5 large stars + optional comment.
7. **Wallet** — balance, top-up via Razorpay, transaction ledger.
8. **Profile**.

### Worker panel
1. **Dashboard** — big online/offline toggle at the top (the primary control), today's
   earnings, wallet balance, rating, incoming request cards.
2. **Job request card** — service icon, area, address, payout amount, and the two large
   accept/decline icon buttons.
3. **My jobs** — accepted jobs with a "Mark complete" action; history with filters.
4. **My services** — checkbox grid of the 12 services (icon + name).
5. **My areas** — checkbox list of areas.
6. **Earnings** — wallet balance and transaction ledger.
7. **My reviews** — rating breakdown and customer comments.
8. **Profile**.

### Admin panel
1. **Dashboard** — stat cards (customers, workers, online now, total bookings, GMV,
   commission earned) + bookings-by-status chart.
2. **Bookings** — filterable table with customer, worker, service, amount, status, date.
3. **Customers** — search, block/unblock.
4. **Workers** — search, online status, rating, block/unblock.
5. **Transactions** — full wallet ledger.

### Frontend conventions
- One `AuthContext` holding `{ user, role, token }`, persisted in `localStorage`.
- `ProtectedRoute` component checks role; wrong role redirects to that role's home.
- Axios interceptor attaches the token and on `401` logs out and redirects to login.
- Every list has three visual states: **loading skeleton**, **empty state with an action**,
  **error state with a retry button**. Never a blank screen.
- Money is formatted by one shared helper: `formatMoney(paise)` → `₹1,299`.
- Toast notifications for every success/failure (small custom component, no extra library).

---

## 10. Environment variables (`server/.env.example`)

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gharsakhi
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
PLATFORM_COMMISSION_PERCENT=20
CUSTOMER_SIGNUP_BONUS_PAISE=200000
CORS_ORIGIN=http://localhost:5173

RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

`client/.env.example`:
```
VITE_API_URL=http://localhost:4000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
```

If Razorpay or VAPID keys are missing, the server must still boot — log a warning and
have those routes return `503 PAYMENTS_NOT_CONFIGURED` / skip push. **The app must be
fully usable without any third-party keys.**

Add an `npm run gen:vapid` script that prints a fresh VAPID key pair.

---

## 11. Build order (phased — stop and report after each phase)

**Phase 0 — Scaffold.** Repo, both package.json files, Vite + Tailwind + tokens, Express
boot with `/api/health`, `.gitignore`, README with setup steps. *Verify: both servers run.*

**Phase 1 — Database.** Migrations 001–003, `pool.js`, `migrate.js`, `seed.js` with all
seed data from §6. *Verify: `npm run migrate && npm run seed` works on a clean DB and
prints row counts.*

**Phase 2 — Auth.** Register/login for all three roles, bcrypt, JWT, `auth` and `adminAuth`
middleware, zod validation, central error handler. *Verify: curl each login endpoint.*

**Phase 3 — Core booking engine.** Services/areas endpoints, matching query, booking
create/accept/decline/complete/cancel, wallet transactions, all inside DB transactions.
This is the highest-risk phase — write it carefully and add a smoke test script that runs
a full booking → accept → complete cycle and asserts the final balances. *Verify: that
script passes and the ledger sums to zero.*

**Phase 4 — Reviews + history filters + wallet endpoints.**

**Phase 5 — Admin API.**

**Phase 6 — Frontend shell.** Design tokens, layouts, auth context, routing, shared
components, landing page.

**Phase 7 — Customer panel.** All screens from §9.

**Phase 8 — Worker panel.**

**Phase 9 — Admin panel.**

**Phase 10 — Polling + push notifications.**

**Phase 11 — Razorpay top-up.**

**Phase 12 — Polish pass.** Responsive check at 375 / 768 / 1440px, keyboard navigation,
reduced-motion, empty/loading/error states, README screenshots section.

---

## 12. Acceptance checklist

Money and state:
- [ ] Booking debits the customer immediately; balance visibly drops.
- [ ] Decline refunds the exact amount; customer balance returns to its original value.
- [ ] Completion credits the worker 80% and records 20% platform commission.
- [ ] `SELECT SUM(amount_paise) FROM wallet_transactions` reconciles against the sum of all
      wallet balances plus platform commission.
- [ ] Booking cannot be accepted twice, completed before acceptance, or reviewed twice.
- [ ] Booking with insufficient balance is rejected and no partial row is written.
- [ ] Killing the server mid-request leaves no half-applied money movement.

Matching:
- [ ] Offline workers never appear in search.
- [ ] A worker who does not cover the area never appears.
- [ ] A worker who does not offer the service never appears.
- [ ] Blocked worker disappears from search immediately.

UI:
- [ ] Works at 375px with no horizontal scroll.
- [ ] Worker sees a new request within ~5 seconds without refreshing.
- [ ] Customer sees status change within ~5 seconds.
- [ ] Every service has its own icon.
- [ ] Online ring pulses; stops pulsing under `prefers-reduced-motion`.
- [ ] Accept/decline buttons are ≥64px and icon-led.
- [ ] Tab key reaches every control with a visible focus ring.
- [ ] All three panels have loading, empty, and error states.

Security:
- [ ] Customer cannot read another customer's booking (test with a swapped ID).
- [ ] Worker cannot complete a booking that isn't theirs.
- [ ] Admin routes reject a customer/worker token.
- [ ] Passwords never appear in any API response.
- [ ] Razorpay signature verification rejects a tampered signature and a replayed order.

---

## 13. Coding rules

1. Every route handler wrapped in `asyncHandler` — no unhandled promise rejections.
2. Every request body validated with zod before touching the database.
3. All SQL parameterised (`$1, $2`) — never string concatenation.
4. Multi-statement writes use `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` in `try/catch/finally`
   with `client.release()` in `finally`.
5. Business logic lives in `services/`, not in route files. Routes only parse, call, respond.
6. No `console.log` in committed code except intentional startup logs.
7. Consistent error codes — define them once in `utils/errors.js`.
8. Frontend components under 200 lines; extract when longer.
9. Commit at the end of each phase with a clear message.
