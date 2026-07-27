import crypto from 'crypto';
import Razorpay from 'razorpay';
import pool from '../db/pool.js';
import { Errors } from '../utils/errors.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const configured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const razorpay = configured ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET }) : null;

export function isPaymentsConfigured() {
  return configured;
}

/**
 * Razorpay's `amount` is already denominated in the smallest currency unit -
 * paise for INR - so it takes our own paise values with no conversion.
 */
export async function createOrder(customerId, amountPaise) {
  if (!configured) throw Errors.PAYMENTS_NOT_CONFIGURED();

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `topup_${customerId}_${Date.now()}`,
  });

  const { rows } = await pool.query(
    `INSERT INTO payment_orders (customer_id, razorpay_order_id, amount_paise, status)
     VALUES ($1, $2, $3, 'created')
     RETURNING id, razorpay_order_id, amount_paise, status`,
    [customerId, order.id, amountPaise]
  );

  return {
    order_id: rows[0].razorpay_order_id,
    amount_paise: rows[0].amount_paise,
    key_id: RAZORPAY_KEY_ID,
  };
}

function isSignatureValid(orderId, paymentId, providedSignature) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so a malformed/truncated signature must be length-checked first.
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * §8: HMAC-SHA256 of order_id + "|" + payment_id, keyed with the secret,
 * compared via timingSafeEqual. On success, one transaction: mark the order
 * paid, credit the wallet from the order's OWN stored amount (never from the
 * request body), insert a topup row. A replay (order already paid) is 409.
 */
export async function verifyAndCreditWallet(customerId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!configured) throw Errors.PAYMENTS_NOT_CONFIGURED();

  if (!isSignatureValid(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw Errors.INVALID_SIGNATURE();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = $1 AND customer_id = $2 FOR UPDATE',
      [razorpay_order_id, customerId]
    );
    const order = orderRows[0];
    if (!order) throw Errors.NOT_FOUND('Payment order not found');
    if (order.status === 'paid') throw Errors.CONFLICT('This payment has already been processed');

    const { rows: custRows } = await client.query(
      'SELECT wallet_paise FROM customers WHERE id = $1 FOR UPDATE',
      [customerId]
    );
    const customer = custRows[0];
    if (!customer) throw Errors.NOT_FOUND('Customer not found');

    const newBalance = customer.wallet_paise + order.amount_paise;

    await client.query('UPDATE customers SET wallet_paise = $1 WHERE id = $2', [newBalance, customerId]);

    await client.query(
      `UPDATE payment_orders SET status = 'paid', razorpay_payment_id = $1 WHERE id = $2`,
      [razorpay_payment_id, order.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note)
       VALUES ('customer', $1, NULL, 'topup', $2, $3, $4)`,
      [customerId, order.amount_paise, newBalance, `Wallet top-up (Razorpay order ${razorpay_order_id})`]
    );

    await client.query('COMMIT');
    return { wallet_paise: newBalance };
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
