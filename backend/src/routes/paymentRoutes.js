const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

// Public: authenticated by verifying the Razorpay webhook signature instead of a session.
router.post('/webhook/razorpay', ctrl.razorpayWebhook);

router.get('/history', protect, ctrl.listMyPaymentHistory);

module.exports = router;
