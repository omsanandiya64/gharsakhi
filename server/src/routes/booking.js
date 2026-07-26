import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    res.json(await bookingService.listServices());
  })
);

router.get(
  '/areas',
  asyncHandler(async (req, res) => {
    res.json(await bookingService.listAreas());
  })
);

const createBookingSchema = z.object({
  service_id: z.coerce.number().int().positive(),
  worker_id: z.coerce.number().int().positive(),
  area_id: z.coerce.number().int().positive(),
  address_text: z.string().trim().min(1).max(500),
  scheduled_for: z.coerce.date().optional().nullable(),
});

router.post(
  '/bookings',
  auth('customer'),
  validate(createBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json(booking);
  })
);

export default router;
