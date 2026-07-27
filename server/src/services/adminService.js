import pool from '../db/pool.js';
import { Errors } from '../utils/errors.js';
import { toEnvelope } from '../utils/pagination.js';
import { pushBookingFilters } from './bookingService.js';

/**
 * One round trip: each CTE computes an independent aggregate, the final SELECT
 * just pulls scalars off them. `status_counts` cross joins the booking_status
 * enum itself (via enum_range) against bookings so every status is present
 * with a real 0 rather than being absent from the JSON object when a status
 * has no rows yet. GMV/commission are completed-bookings-only - see DECISIONS.md.
 */
export async function getStats() {
  const { rows } = await pool.query(`
    WITH customer_count AS (
      SELECT COUNT(*)::int AS total FROM customers
    ),
    worker_count AS (
      SELECT COUNT(*)::int AS total FROM workers
    ),
    online_count AS (
      SELECT COUNT(*)::int AS total FROM workers WHERE is_online = TRUE AND is_blocked = FALSE
    ),
    status_counts AS (
      SELECT bs.status::text AS status, COALESCE(COUNT(b.id), 0)::int AS count
      FROM unnest(enum_range(NULL::booking_status)) AS bs(status)
      LEFT JOIN bookings b ON b.status = bs.status
      GROUP BY bs.status
    ),
    money AS (
      SELECT COALESCE(SUM(price_paise), 0)::bigint AS gmv_paise,
             COALESCE(SUM(commission_paise), 0)::bigint AS commission_paise
      FROM bookings WHERE status = 'completed'
    )
    SELECT
      (SELECT total FROM customer_count) AS total_customers,
      (SELECT total FROM worker_count) AS total_workers,
      (SELECT total FROM online_count) AS online_workers,
      (SELECT gmv_paise FROM money) AS gmv_paise,
      (SELECT commission_paise FROM money) AS commission_paise,
      (SELECT json_object_agg(status, count) FROM status_counts) AS bookings_by_status
  `);

  const row = rows[0];
  return {
    total_customers: row.total_customers,
    total_workers: row.total_workers,
    online_workers: row.online_workers,
    bookings_by_status: row.bookings_by_status,
    gmv_paise: Number(row.gmv_paise),
    commission_paise: Number(row.commission_paise),
  };
}

export async function listBookings(filters, { pageSize, offset, page }) {
  const params = [];
  const clauses = ['1=1'];
  pushBookingFilters(clauses, params, filters);
  const whereSql = clauses.join(' AND ');

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b WHERE ${whereSql}`,
    params
  );

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.price_paise, b.worker_earning_paise, b.commission_paise,
            b.created_at, b.accepted_at, b.declined_at, b.completed_at, b.cancelled_at,
            s.name AS service_name, s.icon AS service_icon,
            c.id AS customer_id, c.name AS customer_name,
            w.id AS worker_id, w.name AS worker_name,
            a.name AS area_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN customers c ON c.id = b.customer_id
     JOIN workers w ON w.id = b.worker_id
     JOIN areas a ON a.id = b.area_id
     WHERE ${whereSql}
     ORDER BY b.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return toEnvelope(rows, countRows[0].total, { page, pageSize });
}

export async function listCustomers(q, { pageSize, offset, page }) {
  const params = [];
  const clauses = ['1=1'];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  const whereSql = clauses.join(' AND ');

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM customers WHERE ${whereSql}`,
    params
  );

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, wallet_paise, is_blocked, created_at
     FROM customers
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return toEnvelope(rows, countRows[0].total, { page, pageSize });
}

export async function listWorkers(q, { pageSize, offset, page }) {
  const params = [];
  const clauses = ['1=1'];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  const whereSql = clauses.join(' AND ');

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM workers WHERE ${whereSql}`,
    params
  );

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, is_online, is_blocked, wallet_paise, rating_avg, rating_count, created_at
     FROM workers
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return toEnvelope(rows, countRows[0].total, { page, pageSize });
}

export async function listTransactions({ pageSize, offset, page }) {
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS total FROM wallet_transactions');

  const { rows } = await pool.query(
    `SELECT wt.id, wt.actor, wt.actor_id, wt.type, wt.amount_paise, wt.balance_after_paise, wt.note, wt.created_at,
            wt.booking_id, s.name AS service_name,
            CASE wt.actor
              WHEN 'customer' THEN cu.name
              WHEN 'worker' THEN wo.name
              ELSE NULL
            END AS actor_name
     FROM wallet_transactions wt
     LEFT JOIN bookings b ON b.id = wt.booking_id
     LEFT JOIN services s ON s.id = b.service_id
     LEFT JOIN customers cu ON wt.actor = 'customer' AND cu.id = wt.actor_id
     LEFT JOIN workers wo ON wt.actor = 'worker' AND wo.id = wt.actor_id
     ORDER BY wt.created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  return toEnvelope(rows, countRows[0].total, { page, pageSize });
}

export async function setCustomerBlocked(customerId, isBlocked) {
  const { rows } = await pool.query(
    `UPDATE customers SET is_blocked = $1 WHERE id = $2
     RETURNING id, name, phone, email, wallet_paise, is_blocked`,
    [isBlocked, customerId]
  );
  if (!rows[0]) throw Errors.NOT_FOUND('Customer not found');
  return rows[0];
}

/**
 * §7.5: blocked workers are forced offline. One UPDATE, so it's already
 * atomic without needing an explicit BEGIN/COMMIT wrapper - that ceremony in
 * this codebase is reserved for genuinely multi-statement mutations. Setting
 * is_blocked to the value it already has (including is_online, which the
 * CASE only touches when blocking) is a no-op write, so calling this twice
 * with the same flag is naturally idempotent.
 */
export async function setWorkerBlocked(workerId, isBlocked) {
  const { rows } = await pool.query(
    `UPDATE workers
     SET is_blocked = $1,
         is_online = CASE WHEN $1 THEN FALSE ELSE is_online END
     WHERE id = $2
     RETURNING id, name, phone, email, is_online, is_blocked, wallet_paise, rating_avg, rating_count`,
    [isBlocked, workerId]
  );
  if (!rows[0]) throw Errors.NOT_FOUND('Worker not found');
  return rows[0];
}
