const express = require('express');
const router = express.Router();
const { requireLogin, attachUser } = require('../middleware/auth');
const certificateController = require('../controllers/certificateController');

router.get('/generate-certificate', requireLogin, attachUser, certificateController.generateCertificate);
router.get('/verify-certificate', certificateController.verifyCertificate);
router.get('/verify', certificateController.verifyCertificate);

router.get('/:level/render', requireLogin, attachUser, (req, res, next) => {
  req.query.level = req.params.level;
  return certificateController.generateCertificate(req, res, next);
});

router.get('/:level', requireLogin, attachUser, (req, res, next) => {
  req.query.level = req.params.level;
  return certificateController.generateCertificate(req, res, next);
});

module.exports = router;
