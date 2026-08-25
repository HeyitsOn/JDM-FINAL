const express = require('express');
const router = express.Router();
const { registerCompat, loginCompat } = require('../controllers/frontendCompatController');
const { authLimiter } = require('../middleware/rateLimiter');

// Kept for the /api-prefixed, .php-suffixed contract used by the reference
// copies of the frontend (Frontend/Landingpage.html, jdm-academy-v9-cleaned.html).
// The copy actually deployed at node-app/public/index.html calls
// /register and /login instead (see routes/legacy.js), but both variants
// expect the same { ok, user, error } envelope from registerCompat/loginCompat.

router.post('/register.php', authLimiter, registerCompat);
router.post('/login.php', authLimiter, loginCompat);

module.exports = router;
