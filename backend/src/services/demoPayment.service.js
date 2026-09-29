const crypto = require('crypto');

// Simulated payment gateway — generates plausible-looking IDs and outcomes
// entirely locally. No network call, no real gateway involved, ever. This
// exists purely so the app has a demoable "payment gateway" experience
// without real Razorpay credentials or transactions.

function generateFakeOrderId() {
  return `demo_order_${crypto.randomBytes(8).toString('hex')}`;
}

function generateFakePaymentId() {
  return `demo_pay_${crypto.randomBytes(8).toString('hex')}`;
}

function generateReceiptNumber() {
  return `RCPT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Stands in for whatever reference a real payout provider (e.g. RazorpayX)
// would return once it accepts a bank-transfer payout request. Never a real
// transfer - see walletController.completeWithdrawalDemo.
function generatePayoutRef() {
  return `demo_payout_${crypto.randomBytes(8).toString('hex')}`;
}

const FAILURE_REASONS = ['Network error, please try again', 'Insufficient funds', 'Payment cancelled by user'];

function randomFailureReason() {
  return FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
}

// `forcedOutcome` lets the demo UI's "simulate result" toggle override the
// default 90% success / 10% failure random roll - never used for anything
// resembling a real payment decision.
function decideOutcome(forcedOutcome) {
  if (['success', 'failed', 'pending'].includes(forcedOutcome)) return forcedOutcome;
  return Math.random() < 0.9 ? 'success' : 'failed';
}

module.exports = {
  generateFakeOrderId,
  generateFakePaymentId,
  generateReceiptNumber,
  generatePayoutRef,
  randomFailureReason,
  decideOutcome,
};
