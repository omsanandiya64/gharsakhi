import pool from '../db/pool.js';
import { Errors } from '../utils/errors.js';
import { toEnvelope } from '../utils/pagination.js';

async function getWallet(table, actor, actorId, { pageSize, offset, page }) {
  const { rows: balanceRows } = await pool.query(
    `SELECT wallet_paise FROM ${table} WHERE id = $1`,
    [actorId]
  );
  if (!balanceRows[0]) throw Errors.NOT_FOUND(`${actor === 'customer' ? 'Customer' : 'Worker'} not found`);

  const { rows } = await pool.query(
    `SELECT wt.id, wt.type, wt.amount_paise, wt.balance_after_paise, wt.note, wt.created_at,
            wt.booking_id, s.name AS service_name,
            COUNT(*) OVER()::int AS total_count
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
    transactions: toEnvelope(rows, { page, pageSize }),
  };
}

export function getCustomerWallet(customerId, pagination) {
  return getWallet('customers', 'customer', customerId, pagination);
}

export function getWorkerWallet(workerId, pagination) {
  return getWallet('workers', 'worker', workerId, pagination);
}
