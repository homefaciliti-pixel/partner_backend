const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const authController = require('../controllers/authController');
const supportController = require('../controllers/supportController');
const authenticatePartner = require('../middleware/auth');

// Mobile check endpoint
router.post('/check-mobile', authController.checkMobile);
router.get('/check-mobile', authController.checkMobile);

// Profile
router.get('/profile', authenticatePartner, partnerController.getProfile);
router.put('/profile', authenticatePartner, partnerController.updateProfile);

// Password
router.post('/change-password', authenticatePartner, partnerController.changePassword);

// Registration Payment
router.post('/pay-registration', authenticatePartner, partnerController.payRegistration);
router.get('/pay-redirect', partnerController.payRedirect);

// Dashboard & Approval Status
router.get('/dashboard', authenticatePartner, partnerController.getDashboard);
router.get('/approval-status', partnerController.checkApprovalStatus);
router.post('/approval-status', partnerController.checkApprovalStatus);
router.get('/dashboard-status', partnerController.checkApprovalStatus);
router.post('/dashboard-status', partnerController.checkApprovalStatus);

// Online / Offline Status
router.post('/status', authenticatePartner, partnerController.updatePartnerStatus);
router.put('/status', authenticatePartner, partnerController.updatePartnerStatus);

// Location Tracking
router.post('/location', partnerController.updatePartnerLocation);
router.post('/update-location', partnerController.updatePartnerLocation);
router.get('/location', partnerController.getPartnerLocation);
router.get('/location/:id', partnerController.getPartnerLocation);
router.get('/:id/location', partnerController.getPartnerLocation);

// Support & Reviews
router.post('/support', authenticatePartner, supportController.createTicket);
router.get('/support', authenticatePartner, supportController.getTickets);
router.get('/reviews', authenticatePartner, supportController.getReviews);

module.exports = router;
