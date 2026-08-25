const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const progressController = require('../controllers/progressController');
const certificateController = require('../controllers/certificateController');
const { requireLogin } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/session-check', authController.session);
router.post('/save-progress', requireLogin, progressController.saveProgress);
router.get('/get-progress', requireLogin, progressController.getProgress);
router.get('/generate-certificate', requireLogin, certificateController.generateCertificate);
router.get('/verify-certificate', certificateController.verifyCertificate);

module.exports = router;
