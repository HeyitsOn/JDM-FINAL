const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// The shipped frontend (public/index.html) calls these exact paths with
// an { ok, user, error } response envelope instead of the { success, message }
// envelope used by routes/auth.js and routes/legacy.js. These routes adapt
// the same authService to the contract the frontend already expects.

router.post('/register.php', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(req, { name, email, password });
    res.status(200).json({ ok: true, user: result.user });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

router.post('/login.php', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(req, { email, password });
    res.status(200).json({ ok: true, user: result.user });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
