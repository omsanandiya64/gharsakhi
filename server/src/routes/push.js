import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import * as pushService from '../services/pushService.js';
import { Errors } from '../utils/errors.js';

const router = Router();

router.get(
  '/public-key',
  asyncHandler(async (req, res) => {
    if (!pushService.isPushConfigured()) throw Errors.PUSH_NOT_CONFIGURED();
    res.json({ publicKey: pushService.getPublicKey() });
  })
);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.post(
  '/subscribe',
  auth(),
  validate(subscribeSchema),
  asyncHandler(async (req, res) => {
    if (!pushService.isPushConfigured()) throw Errors.PUSH_NOT_CONFIGURED();
    await pushService.saveSubscription(req.user.role, req.user.id, req.body);
    res.status(201).json({ ok: true });
  })
);

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

router.delete(
  '/subscribe',
  auth(),
  validate(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    await pushService.removeSubscription(req.body.endpoint);
    res.json({ ok: true });
  })
);

export default router;
