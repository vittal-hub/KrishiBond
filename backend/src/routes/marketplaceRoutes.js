const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createListingSchema, updateListingSchema } = require('../validators/marketplaceValidators');
const ctrl = require('../controllers/marketplaceController');

const router = express.Router();

router.get('/listings', protect, ctrl.searchListings);
router.post('/listings', protect, validate(createListingSchema), ctrl.createListing);
router.get('/listings/:id', protect, ctrl.getListing);
router.put('/listings/:id', protect, validate(updateListingSchema), ctrl.updateListing);
router.delete('/listings/:id', protect, ctrl.deleteListing);
router.get('/matches', protect, ctrl.getMatches);
router.get('/price-benchmark', protect, ctrl.getPriceBenchmark);

module.exports = router;
