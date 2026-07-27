import webpush from 'web-push';
import pool from '../db/pool.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isPushConfigured() {
  return configured;
}

export function getPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export async function saveSubscription(actor, actorId, subscription) {
  const { endpoint, keys } = subscription;
  await pool.query(
    `INSERT INTO push_subscriptions (actor, actor_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET actor = $1, actor_id = $2, p256dh = $4, auth = $5`,
    [actor, actorId, endpoint, keys.p256dh, keys.auth]
  );
}

export async function removeSubscription(endpoint) {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

/**
 * Fire-and-forget by contract: the caller never awaits this in the request's
 * critical path. Every failure is caught and logged here so a dead push
 * service or a stale subscription can never surface as, or delay, an API
 * error. A 410 Gone means the browser unsubscribed on its end - prune it so
 * we stop paying for a send that will never succeed again.
 */
export async function sendPushToActor(actor, actorId, payload) {
  if (!configured) return;

  let rows;
  try {
    ({ rows } = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE actor = $1 AND actor_id = $2',
      [actor, actorId]
    ));
  } catch (err) {
    console.error('Push: failed to load subscriptions:', err.message);
    return;
  }

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 410) {
          try {
            await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
          } catch (deleteErr) {
            console.error('Push: failed to prune expired subscription:', deleteErr.message);
          }
        } else {
          console.error('Push: send failed:', err.message);
        }
      }
    })
  );
}
