import pool from '../db/pool.js';
import { Errors } from '../utils/errors.js';
import { toEnvelope } from '../utils/pagination.js';
import { istDayStartUtc, nextCalendarDay } from '../utils/dateRange.js';

async function getWallet(table, actor, actorId, { pageSize, offset, page }) {
  const { rows: balanceRows } = await pool.query(
    `SELECT wallet_paise FROM ${table} WHERE id = $1`,
    [actorId]
  );
  if (!balanceRows[0]) throw Errors.NOT_FOUND(`${actor === 'customer' ? 'Customer' : 'Worker'} not found`);

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM wallet_transactions WHERE actor = $1 AND actor_id = $2',
    [actor, actorId]
  );

  const { rows } = await pool.query(
    `SELECT wt.id, wt.type, wt.amount_paise, wt.balance_after_paise, wt.note, wt.created_at,
            wt.booking_id, s.name AS service_name
     FROM wallet_transactions wt
     LEFT JOIN bookings b ON b.id = wt.booking_id
     LEFT JOIN services s ON s.id = b.service_id
     WHERE wt.actor = $1 AND wt.actor_id = $2
     ORDER BY wt.created_at DESC
     LIMIT $3 OFFSET $4`,
    [actor, actorId, pageSize, offset]
  );

  return {
    balance_paise: balanceRows[0].wallet_paise,
    transactions: toEnvelope(rows, countRows[0].total, { page, pageSize }),
  };
}

export function getCustomerWallet(customerId, pagination) {
  return getWallet('customers', 'customer', customerId, pagination);
}

export function getWorkerWallet(workerId, pagination) {
  return getWallet('workers', 'worker', workerId, pagination);
}

/**
 * "Today" is the worker's IST calendar day, computed from the server's
 * current instant the same way the from/to booking filters are (§4 boundary
 * rule) - not the client's local timezone.
 */
export async function getTodayEarnings(workerId) {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const todayStr = istNow.toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount_paise), 0)::int AS total
     FROM wallet_transactions
     WHERE actor = 'worker' AND actor_id = $1 AND type = 'earning'
       AND created_at >= $2 AND created_at < $3`,
    [workerId, istDayStartUtc(todayStr), istDayStartUtc(nextCalendarDay(todayStr))]
  );
  return rows[0].total;
}
