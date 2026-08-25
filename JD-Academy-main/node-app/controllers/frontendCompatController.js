const authService = require('../services/authService');

// The frontend (public/index.html) always reads { ok, user, error } from
// auth calls, regardless of which base path it's built against. Verified by
// reading the shipped JS: submitRegister()/submitLogin() check result.ok and
// result.error, never result.success/result.message.

async function registerCompat(req, res) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(req, { name, email, password });
    res.status(200).json({ ok: true, user: result.user });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
}

async function loginCompat(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(req, { email, password });
    res.status(200).json({ ok: true, user: result.user });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
}

module.exports = { registerCompat, loginCompat };
