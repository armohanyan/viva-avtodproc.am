import rateLimit from 'express-rate-limit';

/** Login / register / MFA verification — keep strict to slow password guessing. */
export const authCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

/** Refresh + logout may run often (tab wake, parallel requests); still bounded. */
export const authSessionMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many session requests. Try again later.' },
});
