import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from './pool.js';
import { splitPrice } from '../utils/money.js';

const SIGNUP_BONUS_PAISE = Number(process.env.CUSTOMER_SIGNUP_BONUS_PAISE || 200000);

const SERVICES = [
  { code: 'bathroom_cleaning', name: 'Bathroom Cleaning', icon: 'ShowerHead', price: 349, description: 'Deep clean of bathroom tiles, fittings, and floor.' },
  { code: 'kitchen_cleaning', name: 'Kitchen Cleaning', icon: 'CookingPot', price: 449, description: 'Degreasing and sanitising of kitchen surfaces and slabs.' },
  { code: 'full_home_cleaning', name: 'Full Home Cleaning', icon: 'Home', price: 1299, description: 'Complete top-to-bottom cleaning of the entire home.' },
  { code: 'sofa_carpet_cleaning', name: 'Sofa & Carpet Cleaning', icon: 'Sofa', price: 899, description: 'Shampoo and vacuum cleaning for sofas and carpets.' },
  { code: 'utensils_washing', name: 'Utensils Washing', icon: 'Utensils', price: 199, description: 'Daily washing of dishes and kitchen utensils.' },
  { code: 'laundry_ironing', name: 'Laundry & Ironing', icon: 'Shirt', price: 299, description: 'Washing, drying, and ironing of clothes.' },
  { code: 'cooking', name: 'Cooking', icon: 'ChefHat', price: 599, description: 'Home-style meal preparation for the day.' },
  { code: 'baby_elder_care', name: 'Baby & Elder Care', icon: 'HeartHandshake', price: 799, description: 'Attentive care and assistance for babies or elders.' },
  { code: 'gardening', name: 'Gardening', icon: 'Sprout', price: 499, description: 'Lawn mowing, pruning, and plant care.' },
  { code: 'pest_control', name: 'Pest Control', icon: 'Bug', price: 1499, description: 'Safe pest and insect treatment for the home.' },
  { code: 'car_washing', name: 'Car Washing', icon: 'Car', price: 349, description: 'Exterior and interior car cleaning.' },
  { code: 'office_cleaning', name: 'Office Cleaning', icon: 'Building2', price: 1099, description: 'Cleaning of office desks, floors, and common areas.' },
];

const AREAS = [
  'Satellite', 'Bopal', 'Vastrapur', 'Navrangpura', 'Maninagar', 'Chandkheda',
  'Gota', 'Thaltej', 'Prahlad Nagar', 'Naranpura', 'S.G. Highway', 'Nikol',
];

const CUSTOMERS = [
  { name: 'Priya Shah', phone: '9998887771', email: 'priya@example.com', area: 'Satellite', address: '12 Sunrise Apartments, Satellite Road' },
  { name: 'Rahul Mehta', phone: '9998887772', email: 'rahul@example.com', area: 'Vastrapur', address: '45 Silver Heights, Vastrapur' },
  { name: 'Anjali Patel', phone: '9998887773', email: 'anjali@example.com', area: 'Bopal', address: '7 Green View Society, Bopal' },
];

const WORKERS = [
  { name: 'Meera Solanki', phone: '9887771001', email: 'meera.w@example.com', bio: '5 years experience in home cleaning.', online: true, services: ['bathroom_cleaning', 'kitchen_cleaning', 'full_home_cleaning'], areas: ['Satellite', 'Vastrapur'] },
  { name: 'Kavita Chauhan', phone: '9887771002', email: 'kavita.w@example.com', bio: 'Specialist in utensils and laundry.', online: true, services: ['utensils_washing', 'laundry_ironing'], areas: ['Satellite', 'Navrangpura'] },
  { name: 'Sunita Rathod', phone: '9887771003', email: 'sunita.w@example.com', bio: 'Experienced cook and elder-care attendant.', online: false, services: ['cooking', 'baby_elder_care'], areas: ['Bopal', 'Prahlad Nagar'] },
  { name: 'Geeta Vaghela', phone: '9887771004', email: 'geeta.w@example.com', bio: 'Deep-cleaning and gardening expert.', online: true, services: ['full_home_cleaning', 'sofa_carpet_cleaning', 'gardening'], areas: ['Vastrapur', 'Thaltej'] },
  { name: 'Rekha Parmar', phone: '9887771005', email: 'rekha.w@example.com', bio: 'Quick, reliable bathroom and utensils cleaning.', online: true, services: ['bathroom_cleaning', 'utensils_washing'], areas: ['Maninagar', 'Nikol'] },
  { name: 'Lata Thakor', phone: '9887771006', email: 'lata.w@example.com', bio: 'Pest control and office cleaning specialist.', online: false, services: ['pest_control', 'office_cleaning'], areas: ['Chandkheda', 'Gota'] },
  { name: 'Suman Joshi', phone: '9887771007', email: 'suman.w@example.com', bio: 'Car washing and office cleaning.', online: true, services: ['car_washing', 'office_cleaning'], areas: ['S.G. Highway', 'Naranpura'] },
  { name: 'Radha Makwana', phone: '9887771008', email: 'radha.w@example.com', bio: 'Cooking, laundry, and kitchen cleaning.', online: true, services: ['cooking', 'laundry_ironing', 'kitchen_cleaning'], areas: ['Satellite', 'Bopal', 'Prahlad Nagar'] },
];

// customerIdx / workerIdx are 0-based positions into CUSTOMERS / WORKERS above.
// daysAgo controls created_at ordering (oldest first).
const BOOKINGS = [
  { customerIdx: 0, workerIdx: 0, service: 'bathroom_cleaning', area: 'Satellite', status: 'completed', daysAgo: 20, rating: 5, comment: 'Excellent service, very thorough!' },
  { customerIdx: 1, workerIdx: 3, service: 'gardening', area: 'Vastrapur', status: 'completed', daysAgo: 18, rating: 4, comment: 'Lawn looks great, slightly late.' },
  { customerIdx: 2, workerIdx: 2, service: 'cooking', area: 'Bopal', status: 'completed', daysAgo: 17, rating: 5, comment: 'Delicious food, highly recommend.' },
  { customerIdx: 0, workerIdx: 1, service: 'laundry_ironing', area: 'Satellite', status: 'completed', daysAgo: 15, rating: 4, comment: 'Neat and on time.' },
  { customerIdx: 1, workerIdx: 6, service: 'car_washing', area: 'S.G. Highway', status: 'completed', daysAgo: 14, rating: 5, comment: 'Car looks brand new!' },

  { customerIdx: 2, workerIdx: 5, service: 'office_cleaning', area: 'Chandkheda', status: 'declined', daysAgo: 12, declineReason: 'Not available at that time slot.' },
  { customerIdx: 0, workerIdx: 4, service: 'utensils_washing', area: 'Maninagar', status: 'declined', daysAgo: 10, declineReason: 'Outside my current coverage today.' },
  { customerIdx: 1, workerIdx: 7, service: 'kitchen_cleaning', area: 'Prahlad Nagar', status: 'declined', daysAgo: 9, declineReason: 'Fully booked for the day.' },

  { customerIdx: 2, workerIdx: 3, service: 'sofa_carpet_cleaning', area: 'Vastrapur', status: 'cancelled', daysAgo: 8 },
  { customerIdx: 0, workerIdx: 0, service: 'full_home_cleaning', area: 'Satellite', status: 'cancelled', daysAgo: 6 },

  { customerIdx: 1, workerIdx: 1, service: 'laundry_ironing', area: 'Navrangpura', status: 'accepted', daysAgo: 4 },
  { customerIdx: 2, workerIdx: 6, service: 'car_washing', area: 'Naranpura', status: 'accepted', daysAgo: 3 },

  { customerIdx: 0, workerIdx: 2, service: 'baby_elder_care', area: 'Prahlad Nagar', status: 'pending', daysAgo: 2 },
  { customerIdx: 1, workerIdx: 4, service: 'bathroom_cleaning', area: 'Nikol', status: 'pending', daysAgo: 1 },
  { customerIdx: 2, workerIdx: 7, service: 'cooking', area: 'Bopal', status: 'pending', daysAgo: 0 },
];

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Wiping existing data...');
    await client.query(`
      TRUNCATE TABLE
        reviews, wallet_transactions, bookings,
        worker_areas, worker_services, payment_orders, push_subscriptions,
        workers, customers, areas, services, admins
      RESTART IDENTITY CASCADE
    `);

    const serviceIdByCode = {};
    const servicePriceByCode = {};
    for (const s of SERVICES) {
      const pricePaise = s.price * 100;
      const { rows } = await client.query(
        `INSERT INTO services (code, name, icon, price_paise, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [s.code, s.name, s.icon, pricePaise, s.description]
      );
      serviceIdByCode[s.code] = rows[0].id;
      servicePriceByCode[s.code] = pricePaise;
    }

    const areaIdByName = {};
    for (const name of AREAS) {
      const { rows } = await client.query(
        `INSERT INTO areas (name, city) VALUES ($1, 'Ahmedabad') RETURNING id`,
        [name]
      );
      areaIdByName[name] = rows[0].id;
    }

    const adminHash = await bcrypt.hash('admin@123', 10);
    await client.query(`INSERT INTO admins (username, password_hash) VALUES ('admin', $1)`, [adminHash]);

    const demoHash = await bcrypt.hash('password123', 10);

    const customerIds = [];
    const customerBalance = {};
    for (const c of CUSTOMERS) {
      const { rows } = await client.query(
        `INSERT INTO customers (name, phone, email, password_hash, address_text, area_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, wallet_paise`,
        [c.name, c.phone, c.email, demoHash, c.address, areaIdByName[c.area]]
      );
      customerIds.push(rows[0].id);
      customerBalance[rows[0].id] = rows[0].wallet_paise;
    }

    const workerIds = [];
    const workerBalance = {};
    for (const w of WORKERS) {
      const { rows } = await client.query(
        `INSERT INTO workers (name, phone, email, password_hash, bio, is_online)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, wallet_paise`,
        [w.name, w.phone, w.email, demoHash, w.bio, w.online]
      );
      const id = rows[0].id;
      workerIds.push(id);
      workerBalance[id] = rows[0].wallet_paise;

      for (const code of w.services) {
        await client.query(`INSERT INTO worker_services (worker_id, service_id) VALUES ($1,$2)`, [id, serviceIdByCode[code]]);
      }
      for (const areaName of w.areas) {
        await client.query(`INSERT INTO worker_areas (worker_id, area_id) VALUES ($1,$2)`, [id, areaIdByName[areaName]]);
      }
    }

    const reviewsToInsert = [];

    for (const b of BOOKINGS) {
      const custId = customerIds[b.customerIdx];
      const workerId = workerIds[b.workerIdx];
      const serviceId = serviceIdByCode[b.service];
      const areaId = areaIdByName[b.area];
      const pricePaise = servicePriceByCode[b.service];
      const { commissionPaise, workerEarningPaise } = splitPrice(pricePaise);

      const createdAt = hoursAgo(b.daysAgo * 24);
      const acceptedAt = ['accepted', 'completed'].includes(b.status) ? hoursAgo(b.daysAgo * 24 - 1) : null;
      const declinedAt = b.status === 'declined' ? hoursAgo(b.daysAgo * 24 - 3) : null;
      const completedAt = b.status === 'completed' ? hoursAgo(b.daysAgo * 24 - 25) : null;
      const cancelledAt = b.status === 'cancelled' ? hoursAgo(b.daysAgo * 24 - 1) : null;

      const { rows } = await client.query(
        `INSERT INTO bookings
          (customer_id, worker_id, service_id, area_id, address_text, status,
           price_paise, worker_earning_paise, commission_paise, decline_reason,
           created_at, accepted_at, declined_at, completed_at, cancelled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [custId, workerId, serviceId, areaId, CUSTOMERS[b.customerIdx].address, b.status,
          pricePaise, workerEarningPaise, commissionPaise, b.declineReason || null,
          createdAt, acceptedAt, declinedAt, completedAt, cancelledAt]
      );
      const bookingId = rows[0].id;

      customerBalance[custId] -= pricePaise;
      await client.query(
        `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note, created_at)
         VALUES ('customer',$1,$2,'hold',$3,$4,$5,$6)`,
        [custId, bookingId, -pricePaise, customerBalance[custId], `Booking #${bookingId} created`, createdAt]
      );

      if (b.status === 'declined' || b.status === 'cancelled') {
        customerBalance[custId] += pricePaise;
        const ts = b.status === 'declined' ? declinedAt : cancelledAt;
        await client.query(
          `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note, created_at)
           VALUES ('customer',$1,$2,'refund',$3,$4,$5,$6)`,
          [custId, bookingId, pricePaise, customerBalance[custId], `Booking #${bookingId} ${b.status}`, ts]
        );
      }

      if (b.status === 'completed') {
        workerBalance[workerId] += workerEarningPaise;
        await client.query(
          `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note, created_at)
           VALUES ('worker',$1,$2,'earning',$3,$4,$5,$6)`,
          [workerId, bookingId, workerEarningPaise, workerBalance[workerId], `Booking #${bookingId} completed`, completedAt]
        );
        await client.query(
          `INSERT INTO wallet_transactions (actor, actor_id, booking_id, type, amount_paise, balance_after_paise, note, created_at)
           VALUES ('platform',NULL,$1,'commission',$2,NULL,$3,$4)`,
          [bookingId, commissionPaise, `Commission on booking #${bookingId}`, completedAt]
        );

        if (b.rating) {
          reviewsToInsert.push({ bookingId, custId, workerId, rating: b.rating, comment: b.comment });
        }
      }
    }

    for (const custId of customerIds) {
      await client.query(`UPDATE customers SET wallet_paise=$1 WHERE id=$2`, [customerBalance[custId], custId]);
    }
    for (const workerId of workerIds) {
      await client.query(`UPDATE workers SET wallet_paise=$1 WHERE id=$2`, [workerBalance[workerId], workerId]);
    }

    const ratedWorkerIds = new Set();
    for (const r of reviewsToInsert) {
      await client.query(
        `INSERT INTO reviews (booking_id, customer_id, worker_id, rating, comment) VALUES ($1,$2,$3,$4,$5)`,
        [r.bookingId, r.custId, r.workerId, r.rating, r.comment]
      );
      ratedWorkerIds.add(r.workerId);
    }
    for (const workerId of ratedWorkerIds) {
      await client.query(
        `UPDATE workers w
         SET rating_count = sub.c, rating_avg = sub.a
         FROM (SELECT COUNT(*) c, ROUND(AVG(rating),2) a FROM reviews WHERE worker_id=$1) sub
         WHERE w.id = $1`,
        [workerId]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.\n');
    console.log('All seeded passwords: password123 (admin password: admin@123)\n');

    await printRowCounts(client);
    await verifyLedger(client);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function printRowCounts(client) {
  const tables = [
    'services', 'areas', 'customers', 'workers', 'worker_services', 'worker_areas',
    'bookings', 'wallet_transactions', 'reviews', 'admins', 'payment_orders', 'push_subscriptions',
  ];
  console.log('Row counts:');
  console.log('table'.padEnd(22) + 'count');
  console.log('-'.repeat(30));
  for (const t of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(t.padEnd(22) + rows[0].c);
  }
  console.log('');
}

async function verifyLedger(client) {
  console.log('Ledger reconciliation:');
  let ok = true;

  const { rows: custRows } = await client.query(`SELECT id, wallet_paise FROM customers ORDER BY id`);
  for (const c of custRows) {
    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='customer' AND actor_id=$1`,
      [c.id]
    );
    const expected = SIGNUP_BONUS_PAISE + rows[0].s;
    const pass = expected === c.wallet_paise && c.wallet_paise >= 0;
    if (!pass) ok = false;
    console.log(`  customer ${c.id}: wallet=${c.wallet_paise} expected=${expected} ${pass ? 'OK' : 'MISMATCH (negative or mismatched balance)'}`);
  }

  const { rows: workerRows } = await client.query(`SELECT id, wallet_paise FROM workers ORDER BY id`);
  for (const w of workerRows) {
    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='worker' AND actor_id=$1`,
      [w.id]
    );
    const expected = rows[0].s;
    const pass = expected === w.wallet_paise;
    if (!pass) ok = false;
    console.log(`  worker ${w.id}: wallet=${w.wallet_paise} expected=${expected} ${pass ? 'OK' : 'MISMATCH'}`);
  }

  const { rows: platRows } = await client.query(
    `SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions WHERE actor='platform'`
  );
  const { rows: commRows } = await client.query(
    `SELECT COALESCE(SUM(commission_paise),0)::int AS s FROM bookings WHERE status='completed'`
  );
  const platMatch = platRows[0].s === commRows[0].s;
  if (!platMatch) ok = false;
  console.log(`  platform commission: ledger=${platRows[0].s} expected(from completed bookings)=${commRows[0].s} ${platMatch ? 'OK' : 'MISMATCH'}`);

  const { rows: totalRows } = await client.query(`SELECT COALESCE(SUM(amount_paise),0)::int AS s FROM wallet_transactions`);
  const sumCustomerWallets = custRows.reduce((a, c) => a + c.wallet_paise, 0);
  const sumWorkerWallets = workerRows.reduce((a, w) => a + w.wallet_paise, 0);
  const initialCustomerTotal = custRows.length * SIGNUP_BONUS_PAISE;
  const expectedTotal = (sumCustomerWallets - initialCustomerTotal) + sumWorkerWallets + platRows[0].s;
  const totalMatch = expectedTotal === totalRows[0].s;
  if (!totalMatch) ok = false;
  console.log(`  SUM(wallet_transactions)=${totalRows[0].s} vs (wallets - initial) + commission =${expectedTotal} ${totalMatch ? 'OK' : 'MISMATCH'}`);

  console.log(ok ? '\nLedger reconciles.' : '\nLedger DOES NOT reconcile.');
  if (!ok) process.exitCode = 1;
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
