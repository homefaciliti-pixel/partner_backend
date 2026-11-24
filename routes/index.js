const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const partnerRoutes = require('./partnerRoutes');
const bookingRoutes = require('./bookingRoutes');
const earningsRoutes = require('./earningsRoutes');
const referralRoutes = require('./referralRoutes');
const metadataRoutes = require('./metadataRoutes');
const pageRoutes = require('./pageRoutes');
const supportRoutes = require('./supportRoutes');
const uploadRoutes = require('./uploadRoutes');
const partnerController = require('../controllers/partnerController');

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/partner', partnerRoutes);
router.use('/partners', partnerRoutes); // alias for backwards compatibility
router.use('/bookings', bookingRoutes);
router.use('/earnings', earningsRoutes);
router.use('/referral', referralRoutes);
router.use('/pages', pageRoutes);
router.use('/support', supportRoutes);
router.use('/upload', uploadRoutes);

// Metadata & Dropdown routes (mounted at /api/metadata, /api/locations, /api/services, /api/countries, /api/settings/version)
router.use('/', metadataRoutes);

// Payment verification endpoint (can be called via GET or POST at /api/payments/verify)
router.post('/payments/verify', partnerController.verifyPayment);
router.get('/payments/verify', partnerController.verifyPayment);

module.exports = router;
