import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[gharsakhi] Razorpay keys missing — payment routes will return 503 PAYMENTS_NOT_CONFIGURED');
}

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.warn('[gharsakhi] VAPID keys missing — push notifications are disabled');
}

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[gharsakhi] server listening on http://localhost:${PORT}`);
});
