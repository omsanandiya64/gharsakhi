import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { signToken } from '../utils/jwt.js';
import { Errors } from '../utils/errors.js';
import { getTodayEarnings } from './walletService.js';

const BCRYPT_ROUNDS = 10;

function duplicateFieldError(err) {
  if (err.code !== '23505') return null;
  if (err.constraint?.includes('phone')) return Errors.PHONE_ALREADY_REGISTERED();
  if (err.constraint?.includes('email')) return Errors.EMAIL_ALREADY_REGISTERED();
  return Errors.CONFLICT('Duplicate value');
}

export async function registerCustomer({ name, phone, email, password, area_id, address }) {
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, email, password_hash, address_text, area_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, phone, email, address_text, area_id, wallet_paise, is_blocked, created_at`,
      [name, phone, email ?? null, password_hash, address ?? null, area_id ?? null]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, role: 'customer' });
    return { token, user };
  } catch (err) {
    throw duplicateFieldError(err) || err;
  }
}

export async function loginCustomer({ phone, password }) {
  const { rows } = await pool.query('SELECT * FROM customers WHERE phone=$1', [phone]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw Errors.INVALID_CREDENTIALS();
  }
  const { password_hash, ...user } = row;
  const token = signToken({ id: user.id, role: 'customer' });
  return { token, user };
}

export async function updateCustomerProfile(customerId, { name, address, area_id }) {
  const { rows: existingRows } = await pool.query('SELECT is_blocked FROM customers WHERE id = $1', [customerId]);
  if (!existingRows[0]) throw Errors.NOT_FOUND('Customer not found');
  if (existingRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

  const fields = [];
  const params = [];
  if (name !== undefined) {
    params.push(name);
    fields.push(`name = $${params.length}`);
  }
  if (address !== undefined) {
    params.push(address);
    fields.push(`address_text = $${params.length}`);
  }
  if (area_id !== undefined) {
    params.push(area_id);
    fields.push(`area_id = $${params.length}`);
  }

  if (fields.length === 0) {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, address_text, area_id, wallet_paise, is_blocked, created_at
       FROM customers WHERE id = $1`,
      [customerId]
    );
    return rows[0];
  }

  params.push(customerId);
  try {
    const { rows } = await pool.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, phone, email, address_text, area_id, wallet_paise, is_blocked, created_at`,
      params
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23503') throw Errors.VALIDATION_ERROR('Selected area does not exist');
    throw err;
  }
}

export async function registerWorker({ name, phone, email, password, service_ids, area_ids }) {
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO workers (name, phone, email, password_hash)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, phone, email, photo_url, bio, is_online, is_blocked,
                 wallet_paise, rating_avg, rating_count, created_at`,
      [name, phone, email ?? null, password_hash]
    );
    const user = rows[0];

    for (const serviceId of service_ids) {
      await client.query(
        'INSERT INTO worker_services (worker_id, service_id) VALUES ($1,$2)',
        [user.id, serviceId]
      );
    }
    for (const areaId of area_ids) {
      await client.query(
        'INSERT INTO worker_areas (worker_id, area_id) VALUES ($1,$2)',
        [user.id, areaId]
      );
    }

    await client.query('COMMIT');
    const token = signToken({ id: user.id, role: 'worker' });
    return { token, user };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    const dup = duplicateFieldError(err);
    if (dup) throw dup;
    if (err.code === '23503') throw Errors.VALIDATION_ERROR('One or more service_ids/area_ids do not exist');
    throw err;
  } finally {
    client.release();
  }
}

export async function loginWorker({ phone, password }) {
  const { rows } = await pool.query('SELECT * FROM workers WHERE phone=$1', [phone]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw Errors.INVALID_CREDENTIALS();
  }
  const { password_hash, ...user } = row;
  const token = signToken({ id: user.id, role: 'worker' });
  return { token, user };
}

export async function getWorkerMe(workerId) {
  const { rows: workerRows } = await pool.query(
    `SELECT id, name, phone, email, photo_url, bio, is_online, is_blocked,
            wallet_paise, rating_avg, rating_count, created_at
     FROM workers WHERE id = $1`,
    [workerId]
  );
  const worker = workerRows[0];
  if (!worker) throw Errors.NOT_FOUND('Worker not found');

  const { rows: services } = await pool.query(
    `SELECT s.id, s.name, s.icon
     FROM worker_services ws JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 ORDER BY s.id`,
    [workerId]
  );
  const { rows: areas } = await pool.query(
    `SELECT a.id, a.name
     FROM worker_areas wa JOIN areas a ON a.id = wa.area_id
     WHERE wa.worker_id = $1 ORDER BY a.name`,
    [workerId]
  );
  const todayEarningPaise = await getTodayEarnings(workerId);

  return { ...worker, services, areas, today_earning_paise: todayEarningPaise };
}

const WORKER_PROFILE_COLUMNS =
  'id, name, phone, email, photo_url, bio, is_online, is_blocked, wallet_paise, rating_avg, rating_count, created_at';

export async function updateWorkerProfile(workerId, { name, bio, photo_url }) {
  const { rows: existingRows } = await pool.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
  if (!existingRows[0]) throw Errors.NOT_FOUND('Worker not found');
  if (existingRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

  const fields = [];
  const params = [];
  if (name !== undefined) {
    params.push(name);
    fields.push(`name = $${params.length}`);
  }
  if (bio !== undefined) {
    params.push(bio);
    fields.push(`bio = $${params.length}`);
  }
  if (photo_url !== undefined) {
    params.push(photo_url);
    fields.push(`photo_url = $${params.length}`);
  }

  if (fields.length === 0) {
    const { rows } = await pool.query(`SELECT ${WORKER_PROFILE_COLUMNS} FROM workers WHERE id = $1`, [workerId]);
    return rows[0];
  }

  params.push(workerId);
  const { rows } = await pool.query(
    `UPDATE workers SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING ${WORKER_PROFILE_COLUMNS}`,
    params
  );
  return rows[0];
}

/**
 * §7.5: going offline never touches bookings - it's a plain flag flip, so an
 * already-accepted job is completely unaffected. This route only stops the
 * worker from appearing in future matching (matchWorkers already filters on
 * is_online), it never cancels anything in progress.
 */
export async function setWorkerAvailability(workerId, isOnline) {
  const { rows: existingRows } = await pool.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
  if (!existingRows[0]) throw Errors.NOT_FOUND('Worker not found');
  if (existingRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

  const { rows } = await pool.query(
    'UPDATE workers SET is_online = $1 WHERE id = $2 RETURNING id, is_online',
    [isOnline, workerId]
  );
  return rows[0];
}

export async function setWorkerServices(workerId, serviceIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
    if (!existingRows[0]) throw Errors.NOT_FOUND('Worker not found');
    if (existingRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

    await client.query('DELETE FROM worker_services WHERE worker_id = $1', [workerId]);
    for (const serviceId of serviceIds) {
      await client.query('INSERT INTO worker_services (worker_id, service_id) VALUES ($1, $2)', [workerId, serviceId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    if (err.code === '23503') throw Errors.VALIDATION_ERROR('One or more service_ids do not exist');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.icon FROM worker_services ws JOIN services s ON s.id = ws.service_id
     WHERE ws.worker_id = $1 ORDER BY s.id`,
    [workerId]
  );
  return rows;
}

export async function setWorkerAreas(workerId, areaIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query('SELECT is_blocked FROM workers WHERE id = $1', [workerId]);
    if (!existingRows[0]) throw Errors.NOT_FOUND('Worker not found');
    if (existingRows[0].is_blocked) throw Errors.ACCOUNT_BLOCKED();

    await client.query('DELETE FROM worker_areas WHERE worker_id = $1', [workerId]);
    for (const areaId of areaIds) {
      await client.query('INSERT INTO worker_areas (worker_id, area_id) VALUES ($1, $2)', [workerId, areaId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    if (err.code === '23503') throw Errors.VALIDATION_ERROR('One or more area_ids do not exist');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT a.id, a.name FROM worker_areas wa JOIN areas a ON a.id = wa.area_id
     WHERE wa.worker_id = $1 ORDER BY a.name`,
    [workerId]
  );
  return rows;
}

export async function loginAdmin({ username, password }) {
  const { rows } = await pool.query('SELECT * FROM admins WHERE username=$1', [username]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw Errors.INVALID_CREDENTIALS();
  }
  const { password_hash, ...user } = row;
  const token = signToken({ id: user.id, role: 'admin' });
  return { token, user };
}
