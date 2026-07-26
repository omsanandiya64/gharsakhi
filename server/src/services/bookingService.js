import pool from '../db/pool.js';
import { splitPrice } from '../utils/money.js';
import { Errors } from '../utils/errors.js';
import { istDayStartUtc, nextCalendarDay } from '../utils/dateRange.js';
import { toEnvelope } from '../utils/pagination.js';

export async function listServices() {
  const { rows } = await pool.query(
    'SELECT id, code, name, icon, price_paise, description FROM services WHERE is_active = TRUE ORDER BY id'
  );
  return rows;
}

export async function listAreas() {
  const { rows } = await pool.query('SELECT id, name, city FROM areas ORDER BY name');
  return rows;
}

/**
 * §7.4 matching query: online, not blocked, offers the service, covers the area.
 */
export async function matchWorkers(serviceId, areaId) {
  const { rows } = await pool.query(
    `SELECT w.id, w.name, w.photo_url, w.bio, w.is_online, w.rating_avg, w.rating_count
     FROM workers w
     WHERE w.is_online = TRUE AND w.is_blocked = FALSE
       AND EXISTS (SELECT 1 FROM worker_services ws WHERE ws.worker_id = w.id AND ws.service_id = $1)
       AND EXISTS (SELECT 1 FROM worker_areas wa WHERE wa.worker_id = w.id AND wa.area_id = $2)
     ORDER BY w.rating_avg DESC, w.rating_count DESC`,
    [serviceId, areaId]
  );
  return rows;
}

/**
 * §7.3 create booking. Single transaction:
 * lock customer -> check blocked/balance -> re-verify worker -> debit -> insert
 * booking -> insert hold wallet_transactions row.
 */
export async function createBooking(customerId, { service_id, worker_id, area_id, address_text, scheduled_for }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: custRows } = await client.query(
      'SELECT id, is_blocked, wallet_paise FROM customers WHERE id = $1 FOR UPDATE',
      [customerId]
    );
    const customer = custRows[0];
    if (!customer) throw Errors.NOT_FOUND('Customer not found');
    if (customer.is_blocked) throw Errors.ACCOUNT_BLOCKED();

    const { rows: serviceRows } = await client.query(
      'SELECT * FROM services WHERE id = $1 AND is_active = TRUE',
      [service_id]
    );
    const service = serviceRows[0];
    if (!service) throw Errors.NOT_FOUND('Service not found');

    const pricePaise = service.price_paise;
    if (customer.wallet_paise < pricePaise) throw Errors.INSUFFICIENT_BALANCE();

    // Re-verified here, inside the transaction, on data as of *now* - not from
    // whatever the client saw when it rendered the worker list a moment ago.
    const { rows: workerRows } = await client.query(
      `SELECT w.id FROM workers w
       WHERE w.id = $1 AND w.is_online = TRUE AND w.is_blocked = FALSE
         AND EXISTS (SELECT 1 FROM worker_services ws WHERE ws.worker_id = w.id AND ws.service_id = $2)
         AND EXISTS (SELECT 1 FROM worker_areas wa WHERE wa.worker_id = w.id AND wa.area_id = $3)`,
      [worker_id, service_id, area_id]
    );
    if (!workerRows[0]) throw Errors.WORKER_UNAVAILABLE();

    const { commissionPaise, workerEarningPaise } = splitPrice(pricePaise);
    const newBalance = customer.wallet_paise - pricePaise;

    await client.query('UPDATE customers SET wallet_paise = $1 WHERE id = $2', [newBalance, customerId]);

    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings
         (customer_id, worker_id, service_id, area_id, address_text, scheduled_for,
          status, price_paise, worker_earning_paise, commission_paise)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)
       RETURNING *`,
      [customerId, worker_id, service_id, area_id, address_text, scheduled_for ?? null,
        pricePaise, workerEarningPaise, commissionPaise]
    );
    const booking = bookingRows[0];

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('customer', $1, $2, 'hold', $3, $4, $5)`,
      [customerId, booking.id, -pricePaise, newBalance, `Booking #${booking.id} created`]
    );

    await client.query('COMMIT');
    return booking;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

async function loadOwnedBooking(client, bookingId, ownerColumn, ownerId) {
  const { rows } = await client.query(
    `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
    [bookingId]
  );
  const booking = rows[0];
  if (!booking || booking[ownerColumn] !== ownerId) throw Errors.NOT_FOUND('Booking not found');
  return booking;
}

/**
 * §7.3 worker accepts - status change only, no money moves.
 */
export async function acceptBooking(workerId, bookingId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: workerRows } = await client.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
    if (!workerRows[0]) throw Errors.NOT_FOUND('Worker not found');
    if (workerRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

    const booking = await loadOwnedBooking(client, bookingId, 'worker_id', workerId);
    if (booking.status !== 'pending') throw Errors.INVALID_TRANSITION();

    const { rows } = await client.query(
      `UPDATE bookings SET status = 'accepted', accepted_at = now() WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * §7.3 worker declines: lock booking -> assert pending -> credit customer -> refund txn.
 */
export async function declineBooking(workerId, bookingId, reason) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: workerRows } = await client.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
    if (!workerRows[0]) throw Errors.NOT_FOUND('Worker not found');
    if (workerRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

    const booking = await loadOwnedBooking(client, bookingId, 'worker_id', workerId);
    if (booking.status !== 'pending') throw Errors.INVALID_TRANSITION();

    const { rows: custRows } = await client.query(
      'SELECT wallet_paise FROM customers WHERE id = $1 FOR UPDATE',
      [booking.customer_id]
    );
    const newBalance = custRows[0].wallet_paise + booking.price_paise;
    await client.query('UPDATE customers SET wallet_paise = $1 WHERE id = $2', [newBalance, booking.customer_id]);

    const { rows } = await client.query(
      `UPDATE bookings SET status = 'declined', declined_at = now(), decline_reason = $2 WHERE id = $1 RETURNING *`,
      [bookingId, reason ?? null]
    );

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('customer', $1, $2, 'refund', $3, $4, $5)`,
      [booking.customer_id, bookingId, booking.price_paise, newBalance, `Booking #${bookingId} declined`]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * §7.3 completion: lock booking -> assert accepted -> credit worker 80% ->
 * record platform 20% commission.
 */
export async function completeBooking(workerId, bookingId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await loadOwnedBooking(client, bookingId, 'worker_id', workerId);
    if (booking.status !== 'accepted') throw Errors.INVALID_TRANSITION();

    const { rows: workerRows } = await client.query(
      'SELECT wallet_paise, is_blocked FROM workers WHERE id = $1 FOR UPDATE',
      [workerId]
    );
    const worker = workerRows[0];
    if (worker.is_blocked) throw Errors.ACCOUNT_BLOCKED();

    const newWorkerBalance = worker.wallet_paise + booking.worker_earning_paise;
    await client.query('UPDATE workers SET wallet_paise = $1 WHERE id = $2', [newWorkerBalance, workerId]);

    const { rows } = await client.query(
      `UPDATE bookings SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('worker', $1, $2, 'earning', $3, $4, $5)`,
      [workerId, bookingId, booking.worker_earning_paise, newWorkerBalance, `Booking #${bookingId} completed`]
    );

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('platform', NULL, $1, 'commission', $2, NULL, $3)`,
      [bookingId, booking.commission_paise, `Commission on booking #${bookingId}`]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * §7.3 customer cancel - only while pending. Same refund path as decline.
 */
export async function cancelBooking(customerId, bookingId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await loadOwnedBooking(client, bookingId, 'customer_id', customerId);
    if (booking.status !== 'pending') throw Errors.INVALID_TRANSITION();

    const { rows: custRows } = await client.query(
      'SELECT wallet_paise, is_blocked FROM customers WHERE id = $1 FOR UPDATE',
      [customerId]
    );
    const customer = custRows[0];
    if (customer.is_blocked) throw Errors.ACCOUNT_BLOCKED();

    const newBalance = customer.wallet_paise + booking.price_paise;
    await client.query('UPDATE customers SET wallet_paise = $1 WHERE id = $2', [newBalance, customerId]);

    const { rows } = await client.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('customer', $1, $2, 'refund', $3, $4, $5)`,
      [customerId, bookingId, booking.price_paise, newBalance, `Booking #${bookingId} cancelled`]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * §7.3 rating: completed bookings only, owning customer only, exactly once.
 * The UNIQUE constraint on reviews.booking_id is the actual correctness
 * guarantee for "exactly once" under concurrency - a check-then-insert here
 * would race two concurrent submissions past the check before either commits.
 */
export async function createReview(customerId, bookingId, { rating, comment }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: bookingRows } = await client.query(
      'SELECT id, customer_id, worker_id, status FROM bookings WHERE id = $1',
      [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking || booking.customer_id !== customerId) throw Errors.NOT_FOUND('Booking not found');
    if (booking.status !== 'completed') throw Errors.INVALID_TRANSITION();

    let review;
    try {
      const { rows } = await client.query(
        `INSERT INTO reviews (booking_id, customer_id, worker_id, rating, comment)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [bookingId, customerId, booking.worker_id, rating, comment ?? null]
      );
      review = rows[0];
    } catch (err) {
      if (err.code === '23505') throw Errors.ALREADY_REVIEWED();
      throw err;
    }

    // Lock the worker row so a second concurrent review for the same worker
    // can't recompute its aggregate from a stale snapshot that's missing this one.
    await client.query('SELECT id FROM workers WHERE id = $1 FOR UPDATE', [booking.worker_id]);
    await client.query(
      `UPDATE workers w
       SET rating_count = sub.c, rating_avg = sub.a
       FROM (SELECT COUNT(*) c, ROUND(AVG(rating), 2) a FROM reviews WHERE worker_id = $1) sub
       WHERE w.id = $1`,
      [booking.worker_id]
    );

    await client.query('COMMIT');
    return review;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Shared filter-building for booking history lists. Pushes onto the same
 * `params` array the caller is already building the query with - never
 * interpolates a value into the SQL string. Column names below are always
 * hardcoded literals, never derived from request input.
 */
function pushBookingFilters(clauses, params, { status, service_id, from, to }) {
  if (status) {
    params.push(status);
    clauses.push(`b.status = $${params.length}`);
  }
  if (service_id) {
    params.push(service_id);
    clauses.push(`b.service_id = $${params.length}`);
  }
  if (from) {
    params.push(istDayStartUtc(from));
    clauses.push(`b.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(istDayStartUtc(nextCalendarDay(to)));
    clauses.push(`b.created_at < $${params.length}`);
  }
}

export async function listCustomerBookings(customerId, filters, { pageSize, offset, page }) {
  const params = [customerId];
  const clauses = ['b.customer_id = $1'];
  pushBookingFilters(clauses, params, filters);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.price_paise, b.worker_earning_paise, b.commission_paise,
            b.address_text, b.scheduled_for, b.decline_reason,
            b.created_at, b.accepted_at, b.declined_at, b.completed_at, b.cancelled_at,
            s.id AS service_id, s.name AS service_name, s.icon AS service_icon,
            w.id AS worker_id, w.name AS worker_name, w.photo_url AS worker_photo_url,
            a.name AS area_name,
            COUNT(*) OVER()::int AS total_count
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN workers w ON w.id = b.worker_id
     JOIN areas a ON a.id = b.area_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY b.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return toEnvelope(rows, { page, pageSize });
}

export async function listWorkerBookings(workerId, filters, { pageSize, offset, page }) {
  const params = [workerId];
  const clauses = ['b.worker_id = $1'];
  pushBookingFilters(clauses, params, filters);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.price_paise, b.worker_earning_paise, b.commission_paise,
            b.address_text, b.scheduled_for, b.decline_reason,
            b.created_at, b.accepted_at, b.declined_at, b.completed_at, b.cancelled_at,
            s.id AS service_id, s.name AS service_name, s.icon AS service_icon,
            c.id AS customer_id, c.name AS customer_name,
            a.name AS area_name,
            COUNT(*) OVER()::int AS total_count
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN customers c ON c.id = b.customer_id
     JOIN areas a ON a.id = b.area_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY b.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return toEnvelope(rows, { page, pageSize });
}

export async function getCustomerBookingDetail(customerId, bookingId) {
  const { rows } = await pool.query(
    `SELECT b.*, s.name AS service_name, s.icon AS service_icon,
            w.name AS worker_name, w.photo_url AS worker_photo_url,
            w.rating_avg AS worker_rating_avg, a.name AS area_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN workers w ON w.id = b.worker_id
     JOIN areas a ON a.id = b.area_id
     WHERE b.id = $1 AND b.customer_id = $2`,
    [bookingId, customerId]
  );
  if (!rows[0]) throw Errors.NOT_FOUND('Booking not found');
  return rows[0];
}

export async function getWorkerProfileDetail(workerId) {
  const { rows: workerRows } = await pool.query(
    `SELECT id, name, photo_url, bio, is_online, rating_avg, rating_count
     FROM workers WHERE id = $1 AND is_blocked = FALSE`,
    [workerId]
  );
  const worker = workerRows[0];
  if (!worker) throw Errors.NOT_FOUND('Worker not found');

  const { rows: recentReviews } = await pool.query(
    `SELECT r.rating, r.comment, r.created_at, c.name AS customer_name
     FROM reviews r
     JOIN customers c ON c.id = r.customer_id
     WHERE r.worker_id = $1
     ORDER BY r.created_at DESC
     LIMIT 5`,
    [workerId]
  );

  return { ...worker, recent_reviews: recentReviews };
}

export async function getWorkerReviews(workerId, { pageSize, offset, page }) {
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.booking_id, c.name AS customer_name,
            COUNT(*) OVER()::int AS total_count
     FROM reviews r
     JOIN customers c ON c.id = r.customer_id
     WHERE r.worker_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [workerId, pageSize, offset]
  );

  const { rows: breakdownRows } = await pool.query(
    `SELECT rating, COUNT(*)::int AS count FROM reviews WHERE worker_id = $1 GROUP BY rating`,
    [workerId]
  );
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of breakdownRows) breakdown[r.rating] = r.count;

  return { breakdown, reviews: toEnvelope(rows, { page, pageSize }) };
}

export async function getWorkerRequests(workerId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.address_text, b.scheduled_for, b.price_paise, b.worker_earning_paise, b.created_at,
            s.id AS service_id, s.name AS service_name, s.icon AS service_icon,
            c.name AS customer_name, a.name AS area_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN customers c ON c.id = b.customer_id
     JOIN areas a ON a.id = b.area_id
     WHERE b.worker_id = $1 AND b.status = 'pending'
     ORDER BY b.created_at ASC`,
    [workerId]
  );
  return rows;
}
