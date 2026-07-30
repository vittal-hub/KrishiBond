const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiter');
const { createReviewSchema, respondReviewSchema } = require('../validators/reviewValidators');
const ctrl = require('../controllers/reviewController');

const router = express.Router();

router.post('/', protect, writeLimiter, validate(createReviewSchema), ctrl.createReview);
router.get('/user/:userId', ctrl.listReviewsForUser);
router.get('/contract/:contractId', protect, ctrl.getContractReviews);
router.post('/:id/response', protect, writeLimiter, validate(respondReviewSchema), ctrl.respondToReview);

module.exports = router;
