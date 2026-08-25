const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const progressController = require('../controllers/progressController');

router.post('/save', requireLogin, progressController.saveProgress);
router.get('/me', requireLogin, progressController.getProgress);

module.exports = router;
