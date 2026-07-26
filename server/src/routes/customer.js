import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';
import * as walletService from '../services/walletService.js';
import { parsePagination } from '../utils/pagination.js';

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

router.get(
  '/workers/:id',
  asyncHandler(async (req, res) => {
    res.json(await bookingService.getWorkerProfileDetail(Number(req.params.id)));
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
    res.json(await bookingService.listCustomerBookings(req.user.id, { status, service_id, from, to }, pagination));
  })
);

router.get(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    res.json(await bookingService.getCustomerBookingDetail(req.user.id, Number(req.params.id)));
  })
);

router.post(
  '/bookings/:id/cancel',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(req.user.id, Number(req.params.id));
    res.json(booking);
  })
);

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

router.post(
  '/bookings/:id/review',
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const review = await bookingService.createReview(req.user.id, Number(req.params.id), req.body);
    res.status(201).json(review);
  })
);

const walletQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().optional(),
});

router.get(
  '/wallet',
  validateQuery(walletQuerySchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.validatedQuery);
    res.json(await walletService.getCustomerWallet(req.user.id, pagination));
  })
);

export default router;
