const progressService = require('../services/progressService');

async function saveProgress(req, res, next) {
  try {
    const userId = req.session.userId;
    const result = await progressService.saveProgress(userId, req.body);
    res.json({ success: true, message: 'Progress saved.', ...result });
  } catch (err) {
    next(err);
  }
}

const certificateService = require('../services/certificateService');

async function getProgress(req, res, next) {
  try {
    const userId = req.session.userId;
    const levels = await progressService.getProgress(userId);
    const certificates = await certificateService.getCertificatesByUserId(userId);
    res.json({ success: true, levels, certificates });
  } catch (err) {
    next(err);
  }
}

module.exports = { saveProgress, getProgress };
