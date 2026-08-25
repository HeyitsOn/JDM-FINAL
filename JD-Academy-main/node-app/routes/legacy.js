const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const progressController = require('../controllers/progressController');
const certificateController = require('../controllers/certificateController');
const pageVisitController = require('../controllers/pageVisitController');
const { registerCompat, loginCompat } = require('../controllers/frontendCompatController');
const { requireLogin, attachUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// node-app/public/index.html -- the frontend actually deployed by this app --
// calls these exact paths (no /api prefix, no .php suffix) and expects an
// { ok, user, error } envelope, not authController's { success, message }.
// See routes/frontendCompat.js for the other frontend copies' contract.
router.post('/register', authLimiter, registerCompat);
router.post('/login', authLimiter, loginCompat);

router.post('/logout', authController.logout);
router.get('/session-check', authController.session);
router.post('/save-progress', requireLogin, progressController.saveProgress);
router.get('/get-progress', requireLogin, progressController.getProgress);
// attachUser is required, not optional here -- generateCertificate reads
// req.user.name and 404s ("Account not found") without it. This route was
// previously missing it (routes/certificates.js already had it correctly).
router.get('/generate-certificate', requireLogin, attachUser, certificateController.generateCertificate);
router.get('/verify-certificate', certificateController.verifyCertificate);
router.get('/my-certificates', requireLogin, attachUser, certificateController.myCertificates);

// apiSaveVisit() in the frontend posts here (bookmarks / page-visit tracking) --
// intentionally a separate table/endpoint from /save-progress's quiz scores.
router.post('/page-visits', requireLogin, pageVisitController.recordVisit);

module.exports = router;
