const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

router.get('/', pageController.getPages);
router.get('/:id', pageController.getPageById);

module.exports = router;
