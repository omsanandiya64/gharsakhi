import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as paymentService from '../services/paymentService.js';

const router = Router();

router.use(auth('customer'));

const orderSchema = z.object({
  amount_paise: z.coerce.number().int().min(100, 'Minimum top-up is ₹1').max(10000000, 'Maximum top-up is ₹1,00,000'),
});

router.post(
  '/order',
  validate(orderSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentService.createOrder(req.user.id, req.body.amount_paise);
    res.status(201).json(result);
  })
);

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.post(
  '/verify',
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const result = await paymentService.verifyAndCreditWallet(req.user.id, req.body);
    res.json(result);
  })
);

export default router;
