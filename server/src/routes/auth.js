import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import * as authService from '../services/authService.js';

const router = Router();

const phoneSchema = z.string().trim().regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number');
const passwordSchema = z.string().min(6).max(72);

const customerRegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().optional().nullable(),
  password: passwordSchema,
  area_id: z.coerce.number().int().positive().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

const workerRegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().optional().nullable(),
  password: passwordSchema,
  service_ids: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one service'),
  area_ids: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one area'),
});

const loginSchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/customer/register',
  validate(customerRegisterSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerCustomer(req.body);
    res.status(201).json(result);
  })
);

router.post(
  '/customer/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.loginCustomer(req.body);
    res.json(result);
  })
);

router.post(
  '/worker/register',
  validate(workerRegisterSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerWorker(req.body);
    res.status(201).json(result);
  })
);

router.post(
  '/worker/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.loginWorker(req.body);
    res.json(result);
  })
);

router.post(
  '/admin/login',
  validate(adminLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.loginAdmin(req.body);
    res.json(result);
  })
);

export default router;
