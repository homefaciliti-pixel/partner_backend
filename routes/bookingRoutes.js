const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticatePartner = require('../middleware/auth');

router.get('/', authenticatePartner, bookingController.getBookings);
router.get('/stats', authenticatePartner, bookingController.getBookingStats);
router.get('/pending-popup', authenticatePartner, bookingController.getPendingPopup);
router.post('/send-complete-otp', bookingController.sendCompleteOtp);
router.get('/:id', authenticatePartner, bookingController.getBookingDetail);
router.post('/:id/accept', authenticatePartner, bookingController.acceptBooking);
router.post('/:id/reject', authenticatePartner, bookingController.rejectBooking);
router.post('/:id/start', authenticatePartner, bookingController.startBooking);
router.post('/:id/complete', authenticatePartner, bookingController.completeBooking);
router.put('/:id/status', authenticatePartner, bookingController.updateBookingStatus);

module.exports = router;
