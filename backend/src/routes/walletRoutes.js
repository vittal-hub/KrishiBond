const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiter');
const {
  initiateTopupSchema,
  completeTopupSchema,
  verifyTopupSchema,
  initiateWithdrawalSchema,
  completeWithdrawalSchema,
} = require('../validators/walletValidators');
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

// "Withdraw to Bank" - only ever moves money already settled into the
// user's own withdrawable `balance` (see paymentController.releaseEscrow),
// to their own KYC-verified bank account.
router.post('/withdraw/initiate', protect, writeLimiter, validate(initiateWithdrawalSchema), ctrl.initiateWithdrawal);
router.post(
  '/withdraw/:transactionId/demo/complete',
  protect,
  writeLimiter,
  validate(completeWithdrawalSchema),
  ctrl.completeWithdrawalDemo
);

module.exports = router;
