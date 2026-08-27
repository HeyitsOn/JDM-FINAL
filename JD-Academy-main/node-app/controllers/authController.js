const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    res.json(await authService.register(req, { name, email, password }));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    res.json(await authService.login(req, { email, password }));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req);
    res.clearCookie('jdm_session', { path: '/' });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function session(req, res, next) {
  try {
    res.json(await authService.session(req));
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, session };
