CREATE TABLE push_subscriptions (
  id         SERIAL PRIMARY KEY,
  actor      actor_type NOT NULL,
  actor_id   INTEGER NOT NULL,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
