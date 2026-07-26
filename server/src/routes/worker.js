import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';
import * as walletService from '../services/walletService.js';
import { parsePagination } from '../utils/pagination.js';

const router = Router();

router.use(auth('worker'));

router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    res.json(await bookingService.getWorkerRequests(req.user.id));
  })
);

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

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const bookingListQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'completed', 'cancelled']).optional(),
  service_id: z.coerce.number().int().positive().optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().optional(),
});

router.get(
  '/bookings',
  validateQuery(bookingListQuerySchema),
  asyncHandler(async (req, res) => {
    const { status, service_id, from, to, page, page_size } = req.validatedQuery;
    const pagination = parsePagination({ page, page_size });
    res.json(await bookingService.listWorkerBookings(req.user.id, { status, service_id, from, to }, pagination));
  })
);

const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().optional(),
});

router.get(
  '/wallet',
  validateQuery(pageQuerySchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.validatedQuery);
    res.json(await walletService.getWorkerWallet(req.user.id, pagination));
  })
);

router.get(
  '/reviews',
  validateQuery(pageQuerySchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.validatedQuery);
    res.json(await bookingService.getWorkerReviews(req.user.id, pagination));
  })
);

export default router;
