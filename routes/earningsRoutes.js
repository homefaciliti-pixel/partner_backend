const express = require('express');
const router = express.Router();
const earningsController = require('../controllers/earningsController');
const authenticatePartner = require('../middleware/auth');

router.get('/', authenticatePartner, earningsController.getEarnings);

module.exports = router;
