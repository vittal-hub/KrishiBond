const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { imageUpload, verifyFileSignature } = require('../middleware/upload');
const { createListingSchema, updateListingSchema } = require('../validators/marketplaceValidators');
const ctrl = require('../controllers/marketplaceController');

const router = express.Router();

router.get('/listings', protect, ctrl.searchListings);
router.post('/listings', protect, validate(createListingSchema), ctrl.createListing);
router.get('/listings/mine', protect, ctrl.getMyListings);
router.get('/favourites', protect, ctrl.getFavourites);
router.get('/listings/:id', protect, ctrl.getListing);
router.put('/listings/:id', protect, validate(updateListingSchema), ctrl.updateListing);
router.delete('/listings/:id', protect, ctrl.deleteListing);
router.post('/listings/:id/favourite', protect, ctrl.toggleFavourite);
router.post('/listings/:id/images', protect, imageUpload.array('images', 5), verifyFileSignature, ctrl.uploadListingImages);
router.get('/matches', protect, ctrl.getMatches);
router.get('/price-benchmark', protect, ctrl.getPriceBenchmark);

module.exports = router;
