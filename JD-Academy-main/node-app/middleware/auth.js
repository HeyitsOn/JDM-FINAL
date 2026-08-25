const userService = require('../services/userService');

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'You need to log in first.' });
  }
  next();
}

async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await userService.findById(req.session.userId);
      req.user = user;
    } catch (err) {
      return next(err);
    }
  }
  next();
}

module.exports = { requireLogin, attachUser };
