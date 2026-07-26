import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

router.use(auth('worker'));

router.post(
  '/bookings/:id/accept',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.acceptBooking(req.user.id, Number(req.params.id));
    res.json(booking);
  })
);

const declineSchema = z.object({
  reason: z.string().trim().min(1, 'Decline reason is required').max(500),
});

router.post(
  '/bookings/:id/decline',
  validate(declineSchema),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.declineBooking(req.user.id, Number(req.params.id), req.body.reason);
    res.json(booking);
  })
);

router.post(
  '/bookings/:id/complete',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.completeBooking(req.user.id, Number(req.params.id));
    res.json(booking);
  })
);

export default router;
