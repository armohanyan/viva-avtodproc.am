import rateLimit from 'express-rate-limit';

/** Limit checkout starts per IP — slows abuse of stolen session tokens. */
export const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment attempts. Try again later.' },
});

/** Status sync / recovery — allow more frequent polling after bank redirect. */
export const paymentSyncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment status checks. Try again later.' },
});
