import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { signToken } from '../utils/jwt.js';
import { Errors } from '../utils/errors.js';

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
    await client.query('ROLLBACK');
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
