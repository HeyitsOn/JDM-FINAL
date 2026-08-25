const rateLimit = require('express-rate-limit');

// Shared across every register/login entry point (routes/auth.js,
// routes/legacy.js, routes/frontendCompat.js) so brute-forcing any one
// of them is limited the same way.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // The automated test suite legitimately calls login/register far more than
  // 10 times per run (many tests each log in fresh) against the one shared
  // counter above -- skip in-process so tests exercise real auth logic
  // instead of tripping their own rate limit.
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, ok: false, message: 'Too many attempts. Please try again later.', error: 'Too many attempts. Please try again later.' }
});

module.exports = { authLimiter };
