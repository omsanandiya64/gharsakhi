/**
 * Integration smoke test for the escrow booking engine (§7 of the spec).
 * Precondition: run `npm run seed` immediately before this script so the
 * baseline data (customers, workers, wallets) is known-fresh. Exercises the
 * real HTTP API; uses direct DB reads only to verify wallet/ledger state that
 * has no read endpoint yet.
 *
 * Usage: npm run migrate && npm run seed && node tests/smoke-booking.js
 * (requires the server already running on PORT, default http://localhost:4000)
 */
import 'dotenv/config';
import pool from '../src/db/pool.js';
import { splitPrice } from '../src/utils/money.js';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:4000/api';

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, label) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // empty body, fine
  }
  return { status: res.status, body: json };
}

async function login(role, idField, idValue, password) {
  const path = role === 'admin' ? '/auth/admin/login' : `/auth/${role}/login`;
  const { status, body } = await api('POST', path, { body: { [idField]: idValue, password } });
  if (status !== 200) throw new Error(`login failed (${role} ${idValue}): ${status} ${JSON.stringify(body)}`);
  return body;
}

async function registerCustomer(phone) {
  const { status, body } = await api('POST', '/auth/customer/register', {
    body: { name: 'Smoke Test Customer', phone, password: 'password123' },
  });
  if (status !== 201) throw new Error(`register customer failed: ${status} ${JSON.stringify(body)}`);
  return body;
}

async function findService(code) {
  const { body } = await api('GET', '/services');
  const svc = body.find((s) => s.code === code);
  if (!svc) throw new Error(`service ${code} not found`);
  return svc;
}

async function findArea(name) {
  const { body } = await api('GET', '/areas');
  const area = body.find((a) => a.name === name);
  if (!area) throw new Error(`area ${name} not found`);
  return area;
}

async function findWorkerByPhone(phone) {
  const { rows } = await pool.query('SELECT id FROM workers WHERE phone=$1', [phone]);
  if (!rows[0]) throw new Error(`worker ${phone} not found`);
  return rows[0].id;
}

async function walletOf(table, id) {
  const { rows } = await pool.query(`SELECT wallet_paise FROM ${table} WHERE id=$1`, [id]);
  return rows[0].wallet_paise;
}

async function bookingRow(id) {
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id=$1', [id]);
  return rows[0];
}

async function countRows(table) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return rows[0].c;
}

function testMoneySplit() {
  for (const price of [33333, 1, 7, 99999]) {
    const { commissionPaise, workerEarningPaise } = splitPrice(price);
    const sum = commissionPaise + workerEarningPaise;
    ok(sum === price, `splitPrice(${price}): commission(${commissionPaise}) + earning(${workerEarningPaise}) = ${sum}, expected ${price}`);
    ok(commissionPaise >= 0 && workerEarningPaise >= 0, `splitPrice(${price}): no negative parts`);
  }
}

// Scenario A: create -> debit, decline -> refund to exactly original balance.
async function scenarioCreateAndDecline() {
  try {
    const { token, user } = await login('customer', 'phone', '9998887771', 'password123'); // Priya
    const service = await findService('bathroom_cleaning');
    const area = await findArea('Satellite');
    const workerId = await findWorkerByPhone('9887771001'); // Meera

    const before = await walletOf('customers', user.id);
    const bookingsBefore = await countRows('bookings');
    const txnsBefore = await countRows('wallet_transactions');

    const { status, body: booking } = await api('POST', '/bookings', {
      token,
      body: { service_id: service.id, worker_id: workerId, area_id: area.id, address_text: '12 Sunrise Apartments' },
    });
    ok(status === 201, 'A: create booking returns 201');

    const afterCreate = await walletOf('customers', user.id);
    ok(afterCreate === before - service.price_paise, `A: create debits exactly price_paise (before=${before}, after=${afterCreate}, price=${service.price_paise})`);
    ok((await countRows('bookings')) === bookingsBefore + 1, 'A: exactly one booking row inserted');
    ok((await countRows('wallet_transactions')) === txnsBefore + 1, 'A: exactly one wallet_transactions row inserted (hold)');

    const workerLogin = await login('worker', 'phone', '9887771001', 'password123');
    const { status: declineStatus } = await api('POST', `/worker/bookings/${booking.id}/decline`, {
      token: workerLogin.token,
      body: { reason: 'Smoke test decline' },
    });
    ok(declineStatus === 200, 'A: decline returns 200');

    const afterDecline = await walletOf('customers', user.id);
    ok(afterDecline === before, `A: decline refunds to EXACTLY the original balance (before=${before}, after=${afterDecline})`);

    return { declinedBookingId: booking.id, declinedWorkerToken: workerLogin.token };
  } catch (err) {
    fail++;
    failures.push(`Scenario A threw: ${err.message}`);
    console.log(`  FAIL  Scenario A threw: ${err.message}`);
    return {};
  }
}

// Scenario B: accept moves no money at all.
async function scenarioAcceptNoMoney() {
  try {
    const { token, user } = await login('customer', 'phone', '9998887772', 'password123'); // Rahul
    const service = await findService('laundry_ironing');
    const area = await findArea('Navrangpura');
    const workerId = await findWorkerByPhone('9887771002'); // Kavita

    const { status, body: booking } = await api('POST', '/bookings', {
      token,
      body: { service_id: service.id, worker_id: workerId, area_id: area.id, address_text: '45 Silver Heights' },
    });
    ok(status === 201, 'B: create booking succeeds');

    const custAfterCreate = await walletOf('customers', user.id);
    const workerAfterCreate = await walletOf('workers', workerId);
    const txnsBeforeAccept = await countRows('wallet_transactions');

    const workerLogin = await login('worker', 'phone', '9887771002', 'password123');
    const { status: acceptStatus } = await api('POST', `/worker/bookings/${booking.id}/accept`, { token: workerLogin.token });
    ok(acceptStatus === 200, 'B: accept returns 200');

    ok((await walletOf('customers', user.id)) === custAfterCreate, 'B: accept does not change customer wallet');
    ok((await walletOf('workers', workerId)) === workerAfterCreate, 'B: accept does not change worker wallet');
    ok((await countRows('wallet_transactions')) === txnsBeforeAccept, 'B: accept inserts zero new wallet_transactions rows');
  } catch (err) {
    fail++;
    failures.push(`Scenario B threw: ${err.message}`);
    console.log(`  FAIL  Scenario B threw: ${err.message}`);
  }
}

// Scenario C: complete -> worker +80%, platform +20%, sum exact; second complete -> 409.
async function scenarioCompleteSplit() {
  try {
    const { token, user } = await login('customer', 'phone', '9998887773', 'password123'); // Anjali
    const service = await findService('laundry_ironing');
    const area = await findArea('Bopal');
    const workerId = await findWorkerByPhone('9887771008'); // Radha

    const { status, body: booking } = await api('POST', '/bookings', {
      token,
      body: { service_id: service.id, worker_id: workerId, area_id: area.id, address_text: '7 Green View Society' },
    });
    ok(status === 201, 'C: create booking succeeds');
    ok(booking.worker_earning_paise + booking.commission_paise === booking.price_paise,
      `C: worker_earning_paise(${booking.worker_earning_paise}) + commission_paise(${booking.commission_paise}) = price_paise(${booking.price_paise})`);

    const workerBefore = await walletOf('workers', workerId);

    const workerLogin = await login('worker', 'phone', '9887771008', 'password123');
    const { status: acceptStatus } = await api('POST', `/worker/bookings/${booking.id}/accept`, { token: workerLogin.token });
    ok(acceptStatus === 200, 'C: accept succeeds');

    const { status: completeStatus } = await api('POST', `/worker/bookings/${booking.id}/complete`, { token: workerLogin.token });
    ok(completeStatus === 200, 'C: complete returns 200');

    const workerAfter = await walletOf('workers', workerId);
    ok(workerAfter === workerBefore + booking.worker_earning_paise,
      `C: worker credited exactly worker_earning_paise (before=${workerBefore}, after=${workerAfter}, earning=${booking.worker_earning_paise})`);

    const { rows: platformTxns } = await pool.query(
      `SELECT amount_paise FROM wallet_transactions WHERE actor='platform' AND booking_id=$1 AND type='commission'`,
      [booking.id]
    );
    ok(platformTxns.length === 1 && platformTxns[0].amount_paise === booking.commission_paise,
      `C: exactly one platform commission txn of commission_paise (${booking.commission_paise})`);

    const { status: secondCompleteStatus, body: secondCompleteBody } = await api('POST', `/worker/bookings/${booking.id}/complete`, { token: workerLogin.token });
    ok(secondCompleteStatus === 409, `C: second complete on the same booking -> 409 (got ${secondCompleteStatus})`);
    ok(secondCompleteBody?.error?.code === 'INVALID_TRANSITION', `C: second-complete error code is INVALID_TRANSITION (got ${secondCompleteBody?.error?.code})`);
  } catch (err) {
    fail++;
    failures.push(`Scenario C threw: ${err.message}`);
    console.log(`  FAIL  Scenario C threw: ${err.message}`);
  }
}

// Scenario D: accept-after-decline -> 409; complete-before-accept -> 409.
async function scenarioInvalidTransitions(declinedBookingId, declinedWorkerToken) {
  try {
    if (declinedBookingId) {
      const { status, body } = await api('POST', `/worker/bookings/${declinedBookingId}/accept`, { token: declinedWorkerToken });
      ok(status === 409, `D: accept after decline -> 409 (got ${status})`);
      ok(body?.error?.code === 'INVALID_TRANSITION', 'D: accept-after-decline error code is INVALID_TRANSITION');
    } else {
      ok(false, 'D: skipped accept-after-decline (Scenario A did not produce a declined booking)');
    }

    const { token } = await login('customer', 'phone', '9998887771', 'password123'); // Priya
    const service = await findService('kitchen_cleaning');
    const area = await findArea('Prahlad Nagar');
    const workerId = await findWorkerByPhone('9887771008'); // Radha

    const { status: createStatus, body: booking } = await api('POST', '/bookings', {
      token,
      body: { service_id: service.id, worker_id: workerId, area_id: area.id, address_text: 'Test address' },
    });
    ok(createStatus === 201, 'D: setup booking for complete-before-accept created');

    const workerLogin = await login('worker', 'phone', '9887771008', 'password123');
    const { status: completeStatus, body: completeBody } = await api('POST', `/worker/bookings/${booking.id}/complete`, { token: workerLogin.token });
    ok(completeStatus === 409, `D: complete before accept -> 409 (got ${completeStatus})`);
    ok(completeBody?.error?.code === 'INVALID_TRANSITION', 'D: complete-before-accept error code is INVALID_TRANSITION');
  } catch (err) {
    fail++;
    failures.push(`Scenario D threw: ${err.message}`);
    console.log(`  FAIL  Scenario D threw: ${err.message}`);
  }
}

// Scenario E: insufficient balance -> 402, zero rows written.
async function scenarioInsufficientBalance() {
  try {
    const { token, user } = await login('customer', 'phone', '9998887773', 'password123'); // Anjali
    const service = await findService('full_home_cleaning'); // 1299 rupees - pricier than any seeded balance
    const area = await findArea('Satellite');
    const workerId = await findWorkerByPhone('9887771001'); // Meera, online, covers this service+area

    const balanceBefore = await walletOf('customers', user.id);
    ok(balanceBefore < service.price_paise, `E setup: customer balance (${balanceBefore}) < service price (${service.price_paise}) - genuine insufficient-balance case`);

    const bookingsBefore = await countRows('bookings');
    const txnsBefore = await countRows('wallet_transactions');

    const { status, body } = await api('POST', '/bookings', {
      token,
      body: { service_id: service.id, worker_id: workerId, area_id: area.id, address_text: 'Test address' },
    });
    ok(status === 402, `E: insufficient balance -> 402 (got ${status})`);
    ok(body?.error?.code === 'INSUFFICIENT_BALANCE', `E: error code is INSUFFICIENT_BALANCE (got ${body?.error?.code})`);

    ok((await walletOf('customers', user.id)) === balanceBefore, 'E: customer balance unchanged after rejected booking');
    ok((await countRows('bookings')) === bookingsBefore, 'E: zero new booking rows written');
    ok((await countRows('wallet_transactions')) === txnsBefore, 'E: zero new wallet_transactions rows written');
  } catch (err) {
    fail++;
    failures.push(`Scenario E threw: ${err.message}`);
    console.log(`  FAIL  Scenario E threw: ${err.message}`);
  }
}

// Scenario F: offline worker -> 409; worker who doesn't cover the area -> 409.
async function scenarioWorkerAvailability() {
  try {
    const temp1 = await registerCustomer('9111110001');
    const lataId = await findWorkerByPhone('9887771006'); // Lata, offline
    const pestControl = await findService('pest_control');
    const chandkheda = await findArea('Chandkheda');

    const { status, body } = await api('POST', '/bookings', {
      token: temp1.token,
      body: { service_id: pestControl.id, worker_id: lataId, area_id: chandkheda.id, address_text: 'Test address' },
    });
    ok(status === 409, `F: booking an offline worker -> 409 (got ${status})`);
    ok(body?.error?.code === 'WORKER_UNAVAILABLE', `F: error code is WORKER_UNAVAILABLE for offline worker (got ${body?.error?.code})`);

    const temp2 = await registerCustomer('9111110002');
    const meeraId = await findWorkerByPhone('9887771001'); // Meera, online, covers Satellite/Vastrapur only
    const bathroomCleaning = await findService('bathroom_cleaning');
    const bopal = await findArea('Bopal'); // not covered by Meera

    const { status: status2, body: body2 } = await api('POST', '/bookings', {
      token: temp2.token,
      body: { service_id: bathroomCleaning.id, worker_id: meeraId, area_id: bopal.id, address_text: 'Test address' },
    });
    ok(status2 === 409, `F: booking a worker who doesn't cover the area -> 409 (got ${status2})`);
    ok(body2?.error?.code === 'WORKER_UNAVAILABLE', `F: error code is WORKER_UNAVAILABLE for wrong area (got ${body2?.error?.code})`);
  } catch (err) {
    fail++;
    failures.push(`Scenario F threw: ${err.message}`);
    console.log(`  FAIL  Scenario F threw: ${err.message}`);
  }
}

// Scenario G: blocked customer -> 403 on create; blocked worker excluded from matching.
async function scenarioBlockedAccounts() {
  try {
    const temp = await registerCustomer('9111110003');
    await pool.query('UPDATE customers SET is_blocked=TRUE WHERE id=$1', [temp.user.id]);

    const utensils = await findService('utensils_washing');
    const maninagar = await findArea('Maninagar');
    const rekhaId = await findWorkerByPhone('9887771005'); // Rekha, online, offers utensils_washing, covers Maninagar

    const { status, body } = await api('POST', '/bookings', {
      token: temp.token,
      body: { service_id: utensils.id, worker_id: rekhaId, area_id: maninagar.id, address_text: 'Test address' },
    });
    ok(status === 403, `G: blocked customer create -> 403 (got ${status})`);
    ok(body?.error?.code === 'ACCOUNT_BLOCKED', `G: error code is ACCOUNT_BLOCKED (got ${body?.error?.code})`);

    const meeraId = await findWorkerByPhone('9887771001');
    await pool.query('UPDATE workers SET is_blocked=TRUE WHERE id=$1', [meeraId]);

    const custLogin = await login('customer', 'phone', '9998887771', 'password123'); // Priya
    const bathroomCleaning = await findService('bathroom_cleaning');
    const satellite = await findArea('Satellite');
    const { body: matches } = await api('GET', `/customer/workers?service_id=${bathroomCleaning.id}&area_id=${satellite.id}`, { token: custLogin.token });
    ok(Array.isArray(matches) && !matches.some((w) => w.id === meeraId), 'G: blocked worker excluded from matching results');

    await pool.query('UPDATE workers SET is_blocked=FALSE WHERE id=$1', [meeraId]);
  } catch (err) {
    fail++;
    failures.push(`Scenario G threw: ${err.message}`);
    console.log(`  FAIL  Scenario G threw: ${err.message}`);
  }
}

// Scenario H: concurrent accepts / concurrent completes on the same booking.
async function scenarioConcurrency() {
  try {
    const temp = await registerCustomer('9111110004');
    const carWashing = await findService('car_washing');
    const sgHighway = await findArea('S.G. Highway');
    const sumanId = await findWorkerByPhone('9887771007'); // Suman, online, offers car_washing, covers S.G. Highway

    const { status: createStatus, body: booking } = await api('POST', '/bookings', {
      token: temp.token,
      body: { service_id: carWashing.id, worker_id: sumanId, area_id: sgHighway.id, address_text: 'Test address' },
    });
    ok(createStatus === 201, 'H setup: booking for concurrency test created');

    const workerLogin = await login('worker', 'phone', '9887771007', 'password123');

    const [a1, a2] = await Promise.all([
      api('POST', `/worker/bookings/${booking.id}/accept`, { token: workerLogin.token }),
      api('POST', `/worker/bookings/${booking.id}/accept`, { token: workerLogin.token }),
    ]);
    const acceptStatuses = [a1.status, a2.status].sort((x, y) => x - y);
    ok(acceptStatuses[0] === 200 && acceptStatuses[1] === 409,
      `H: exactly one concurrent accept succeeds and one gets 409 (got [${a1.status}, ${a2.status}])`);
    ok((await bookingRow(booking.id)).status === 'accepted', 'H: booking ended up accepted exactly once');

    const [c1, c2] = await Promise.all([
      api('POST', `/worker/bookings/${booking.id}/complete`, { token: workerLogin.token }),
      api('POST', `/worker/bookings/${booking.id}/complete`, { token: workerLogin.token }),
    ]);
    const completeStatuses = [c1.status, c2.status].sort((x, y) => x - y);
    ok(completeStatuses[0] === 200 && completeStatuses[1] === 409,
      `H: exactly one concurrent complete succeeds and one gets 409 (got [${c1.status}, ${c2.status}])`);
    ok((await bookingRow(booking.id)).status === 'completed', 'H: booking ended up completed exactly once');

    const { rows: earningTxns } = await pool.query(`SELECT * FROM wallet_transactions WHERE booking_id=$1 AND type='earning'`, [booking.id]);
    const { rows: commissionTxns } = await pool.query(`SELECT * FROM wallet_transactions WHERE booking_id=$1 AND type='commission'`, [booking.id]);
    ok(earningTxns.length === 1, `H: exactly one earning txn despite concurrent completes (found ${earningTxns.length})`);
    ok(commissionTxns.length === 1, `H: exactly one commission txn despite concurrent completes (found ${commissionTxns.length})`);
  } catch (err) {
    fail++;
    failures.push(`Scenario H threw: ${err.message}`);
    console.log(`  FAIL  Scenario H threw: ${err.message}`);
  }
}

// Scenario I: global ledger reconciliation after the whole run.
async function scenarioLedgerReconciliation() {
  try {
    const SIGNUP_BONUS = Number(process.env.CUSTOMER_SIGNUP_BONUS_PAISE || 200000);

    const { rows: custRows } = await pool.query('SELECT id, wallet_paise FROM customers ORDER BY id');
    for (const c of custRows) {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='customer' AND actor_id=$1`,
        [c.id]
      );
      const expected = SIGNUP_BONUS + rows[0].s;
      ok(expected === c.wallet_paise && c.wallet_paise >= 0, `I: customer ${c.id} wallet (${c.wallet_paise}) = SUM(txns) (${expected}), non-negative`);
    }

    const { rows: workerRows } = await pool.query('SELECT id, wallet_paise FROM workers ORDER BY id');
    for (const w of workerRows) {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='worker' AND actor_id=$1`,
        [w.id]
      );
      ok(rows[0].s === w.wallet_paise && w.wallet_paise >= 0, `I: worker ${w.id} wallet (${w.wallet_paise}) = SUM(txns) (${rows[0].s}), non-negative`);
    }

    const { rows: platRows } = await pool.query(`SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='platform'`);
    const { rows: commRows } = await pool.query(`SELECT COALESCE(SUM(commission_paise),0)::int AS s FROM bookings WHERE status='completed'`);
    ok(platRows[0].s === commRows[0].s, `I: platform commission ledger (${platRows[0].s}) = SUM(commission_paise) of completed bookings (${commRows[0].s})`);
  } catch (err) {
    fail++;
    failures.push(`Scenario I threw: ${err.message}`);
    console.log(`  FAIL  Scenario I threw: ${err.message}`);
  }
}

async function main() {
  console.log('=== Money split unit test (awkward paise values) ===');
  testMoneySplit();

  console.log('\n=== Scenario A: create -> debit exactly, decline -> refund exactly ===');
  const { declinedBookingId, declinedWorkerToken } = await scenarioCreateAndDecline();

  console.log('\n=== Scenario B: accept moves no money ===');
  await scenarioAcceptNoMoney();

  console.log('\n=== Scenario C: complete -> 80/20 split exact; double-complete rejected ===');
  await scenarioCompleteSplit();

  console.log('\n=== Scenario D: accept-after-decline / complete-before-accept -> 409 ===');
  await scenarioInvalidTransitions(declinedBookingId, declinedWorkerToken);

  console.log('\n=== Scenario E: insufficient balance -> 402, zero rows written ===');
  await scenarioInsufficientBalance();

  console.log('\n=== Scenario F: offline worker / wrong area -> 409 WORKER_UNAVAILABLE ===');
  await scenarioWorkerAvailability();

  console.log('\n=== Scenario G: blocked customer / blocked worker ===');
  await scenarioBlockedAccounts();

  console.log('\n=== Scenario H: concurrency (double accept, double complete) ===');
  await scenarioConcurrency();

  console.log('\n=== Scenario I: global ledger reconciliation ===');
  await scenarioLedgerReconciliation();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  await pool.end();
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(async (err) => {
  console.error('Smoke test crashed:', err);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
