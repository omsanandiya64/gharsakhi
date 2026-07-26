CREATE TYPE booking_status AS ENUM ('pending','accepted','declined','completed','cancelled');
CREATE TYPE actor_type     AS ENUM ('customer','worker','platform');
CREATE TYPE txn_type        AS ENUM ('topup','hold','refund','earning','commission');

CREATE TABLE services (
  id           SERIAL PRIMARY KEY,
  code         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,
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
  wallet_paise   INTEGER NOT NULL DEFAULT 200000,
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
  price_paise          INTEGER NOT NULL,
  worker_earning_paise INTEGER NOT NULL,
  commission_paise     INTEGER NOT NULL,
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
  actor_id           INTEGER,
  booking_id         INTEGER REFERENCES bookings(id),
  type               txn_type NOT NULL,
  amount_paise       INTEGER NOT NULL,
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

CREATE TABLE payment_orders (
  id                  SERIAL PRIMARY KEY,
  customer_id         INTEGER NOT NULL REFERENCES customers(id),
  razorpay_order_id   TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  amount_paise        INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'created',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
