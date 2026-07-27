import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminService from '../services/adminService.js';
import { parsePagination } from '../utils/pagination.js';

const router = Router();

router.use(adminAuth);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await adminService.getStats());
  })
);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const pageParams = {
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().optional(),
};

const bookingListQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'completed', 'cancelled']).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
  ...pageParams,
});

router.get(
  '/bookings',
  validateQuery(bookingListQuerySchema),
  asyncHandler(async (req, res) => {
    const { status, from, to, page, page_size } = req.validatedQuery;
    const pagination = parsePagination({ page, page_size });
    res.json(await adminService.listBookings({ status, from, to }, pagination));
  })
);

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  ...pageParams,
});

router.get(
  '/customers',
  validateQuery(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, page, page_size } = req.validatedQuery;
    const pagination = parsePagination({ page, page_size });
    res.json(await adminService.listCustomers(q, pagination));
  })
);

router.get(
  '/workers',
  validateQuery(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const { q, page, page_size } = req.validatedQuery;
    const pagination = parsePagination({ page, page_size });
    res.json(await adminService.listWorkers(q, pagination));
  })
);

const blockSchema = z.object({ is_blocked: z.boolean() });

router.patch(
  '/customers/:id/block',
  validate(blockSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.setCustomerBlocked(Number(req.params.id), req.body.is_blocked));
  })
);

router.patch(
  '/workers/:id/block',
  validate(blockSchema),
  asyncHandler(async (req, res) => {
    res.json(await adminService.setWorkerBlocked(Number(req.params.id), req.body.is_blocked));
  })
);

const pageQuerySchema = z.object(pageParams);

router.get(
  '/transactions',
  validateQuery(pageQuerySchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.validatedQuery);
    res.json(await adminService.listTransactions(pagination));
  })
);

export default router;
