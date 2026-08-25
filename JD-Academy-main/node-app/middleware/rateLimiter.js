const rateLimit = require('express-rate-limit');

// Shared across every register/login entry point (routes/auth.js,
// routes/legacy.js, routes/frontendCompat.js) so brute-forcing any one
// of them is limited the same way.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, ok: false, message: 'Too many attempts. Please try again later.', error: 'Too many attempts. Please try again later.' }
});

module.exports = { authLimiter };
