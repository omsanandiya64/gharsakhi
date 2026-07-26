import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateQuery } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

router.use(auth('customer'));

const matchWorkersQuerySchema = z.object({
  service_id: z.coerce.number().int().positive(),
  area_id: z.coerce.number().int().positive(),
});

router.get(
  '/workers',
  validateQuery(matchWorkersQuerySchema),
  asyncHandler(async (req, res) => {
    const { service_id, area_id } = req.validatedQuery;
    res.json(await bookingService.matchWorkers(service_id, area_id));
  })
);

router.post(
  '/bookings/:id/cancel',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.user.id, Number(req.params.id));
    res.json(booking);
  })
);

export default router;
