const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');

// Metadata hierarchy endpoints
router.get('/metadata/locations', metadataController.getMetadataLocations);
router.get('/metadata/categories', metadataController.getMetadataCategories);

// Specific location dropdowns
router.get('/locations/states', metadataController.getStates);
router.get('/locations/cities', metadataController.getCities);
router.get('/locations/localities', metadataController.getLocalities);

// Specific service/category dropdowns
router.get('/services/categories', metadataController.getCategories);
router.get('/services/subcategories', metadataController.getSubcategories);
router.get('/services/list-by-category', metadataController.getServicesList);

// Countries & App Version
router.get('/countries', metadataController.getCountries);
router.get('/settings/version', metadataController.getAppVersion);

module.exports = router;
