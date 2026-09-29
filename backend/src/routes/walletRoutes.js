const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiter');
const { initiateTopupSchema, completeTopupSchema, verifyTopupSchema } = require('../validators/walletValidators');
const ctrl = require('../controllers/walletController');

const router = express.Router();

router.get('/me', protect, ctrl.getMyWallet);

// "Add Money" - independent of any contract/proposal.
router.post('/topup/initiate', protect, writeLimiter, validate(initiateTopupSchema), ctrl.initiateTopup);
router.post(
  '/topup/:transactionId/demo/complete',
  protect,
  writeLimiter,
  validate(completeTopupSchema),
  ctrl.completeTopupDemo
);
router.post(
  '/topup/:transactionId/verify',
  protect,
  writeLimiter,
  validate(verifyTopupSchema),
  ctrl.verifyTopupRazorpay
);

module.exports = router;
