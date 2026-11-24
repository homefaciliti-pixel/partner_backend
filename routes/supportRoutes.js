const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authenticatePartner = require('../middleware/auth');

router.post('/', authenticatePartner, supportController.createTicket);
router.get('/', authenticatePartner, supportController.getTickets);
router.get('/reviews', authenticatePartner, supportController.getReviews);

module.exports = router;
