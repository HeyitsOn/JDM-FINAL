const pageVisitService = require('../services/pageVisitService');

async function recordVisit(req, res, next) {
  try {
    // The frontend also sends user_id in the body, but it's never trusted --
    // the visit is always attributed to the authenticated session's user.
    const userId = req.session.userId;
    const { topic, bookmarked } = req.body;
    await pageVisitService.recordVisit(userId, topic, Boolean(bookmarked));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { recordVisit };
