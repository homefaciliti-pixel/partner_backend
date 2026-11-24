const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authenticatePartner = require('../middleware/auth');

router.get('/code', authenticatePartner, referralController.getReferralCode);
router.post('/validate', referralController.validateReferralCode);
router.get('/detect', referralController.detectReferral);
router.get('/stats', authenticatePartner, referralController.getReferralStats);
router.get('/history', authenticatePartner, referralController.getReferralHistory);

module.exports = router;
