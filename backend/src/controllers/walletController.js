const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Transaction = require('../models/Transaction');
const Kyc = require('../models/Kyc');
const walletService = require('../services/wallet.service');
const razorpayService = require('../services/razorpay.service');
const demoPaymentService = require('../services/demoPayment.service');
const { razorpay: razorpayConfig } = require('../config/env');

const { getOrCreateWallet } = walletService;

// The bank account a user can withdraw to. Deliberately reuses the existing
// Kyc.bankDetails (already admin-reviewed via the KYC queue) instead of a
// parallel "BankAccount" model - one already-verified place for this data,
// and withdrawal eligibility naturally follows the same admin-approval
// workflow the app already has (AdminDashboard's KYC Queue).
async function getVerifiedBankAccount(userId) {
  const kyc = await Kyc.findOne({ user: userId });
  const bank = kyc?.bankDetails;
  if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountHolderName) return null;
  return { kyc, bank };
}

function maskAccountNumber(accountNumber) {
  const last4 = accountNumber.slice(-4);
  return `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${last4}`;
}

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  const verified = await getVerifiedBankAccount(req.user._id);
  res.json({
    success: true,
    wallet,
    bankAccount: verified
      ? {
          accountHolderName: verified.bank.accountHolderName,
          accountNumberMasked: maskAccountNumber(verified.bank.accountNumber),
          ifsc: verified.bank.ifsc,
          isVerified: verified.kyc.status === 'approved',
        }
      : null,
  });
});

function round2(amount) {
  // Amounts are stored in rupees (consistent with every other money field in
  // this app - Payment.amount, Wallet.balance, etc.) rather than switching
  // this one feature to integer paise, which would leave the codebase with
  // two incompatible money representations. Rounding to paise precision
  // before any arithmetic/storage keeps float drift from accumulating.
  return Math.round(amount * 100) / 100;
}

// Buyer or farmer adding money to their own wallet, independent of any
// contract/proposal - "Wallet -> Add Money". Reuses the same gateway
// abstraction (demo simulation, or real Razorpay if configured) already
// used by the contract-escrow funding flow, but credits Wallet.balance
// directly via a Transaction rather than a contract-scoped Payment (Payment
// requires a `contract`, which a standalone top-up doesn't have).
const initiateTopup = asyncHandler(async (req, res) => {
  const amount = round2(req.body.amount);

  if (razorpayService.isConfigured) {
    const order = await razorpayService.createOrder({
      amount,
      receipt: `topup-${req.user._id}-${Date.now()}`,
      notes: { userId: req.user._id.toString(), purpose: 'wallet_topup' },
    });
    const wallet = await getOrCreateWallet(req.user._id);
    const transaction = await Transaction.create({
      wallet: wallet._id,
      user: req.user._id,
      type: 'wallet_topup',
      amount,
      status: 'pending',
      gateway: 'razorpay',
      meta: { gatewayOrderId: order.id },
    });

    return res.status(201).json({
      success: true,
      gateway: 'razorpay',
      transactionId: transaction._id,
      razorpayOrderId: order.id,
      razorpayKeyId: razorpayConfig.keyId,
      amount,
    });
  }

  const wallet = await getOrCreateWallet(req.user._id);
  const gatewayOrderId = demoPaymentService.generateFakeOrderId();
  const transaction = await Transaction.create({
    wallet: wallet._id,
    user: req.user._id,
    type: 'wallet_topup',
    amount,
    status: 'pending',
    gateway: 'demo',
    meta: { gatewayOrderId },
  });

  res.status(201).json({
    success: true,
    gateway: 'demo',
    transactionId: transaction._id,
    merchant: { name: 'KrishiBond', description: 'Wallet top-up', amount },
  });
});

// Finalizes a demo top-up. Mirrors paymentController.completeDemoPayment's
// outcome handling (dev "force a result" toggle, otherwise a random 90/10
// success/failure roll) - purely local simulation, never a real gateway.
const completeTopupDemo = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.transactionId,
    user: req.user._id,
    type: 'wallet_topup',
    gateway: 'demo',
  });
  if (!transaction) throw new ApiError(404, 'Top-up not found');
  if (transaction.status !== 'pending') {
    return res.json({ success: true, transaction });
  }

  const { outcome: forcedOutcome, method } = req.body;
  const outcome = demoPaymentService.decideOutcome(forcedOutcome);

  if (outcome === 'pending') {
    return res.json({ success: true, transaction });
  }

  if (outcome === 'failed') {
    transaction.status = 'failed';
    transaction.meta = { ...transaction.meta, method, failureReason: demoPaymentService.randomFailureReason() };
    await transaction.save();
    return res.json({ success: true, transaction });
  }

  // Success: credit the wallet only now, after the (simulated) gateway has
  // confirmed the payment - never on the strength of the frontend alone.
  transaction.status = 'success';
  transaction.meta = {
    ...transaction.meta,
    method,
    gatewayPaymentId: demoPaymentService.generateFakePaymentId(),
    receiptNumber: demoPaymentService.generateReceiptNumber(),
  };
  await transaction.save();

  const wallet = await getOrCreateWallet(req.user._id);
  wallet.balance += transaction.amount;
  await wallet.save();

  res.json({ success: true, transaction, wallet });
});

// Confirms a real Razorpay top-up by verifying its signature (same HMAC
// check paymentController.verifyPayment uses), then credits the wallet.
const verifyTopupRazorpay = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.transactionId,
    user: req.user._id,
    type: 'wallet_topup',
    gateway: 'razorpay',
  });
  if (!transaction) throw new ApiError(404, 'Top-up not found');
  if (transaction.status === 'success') {
    return res.json({ success: true, transaction });
  }
  if (transaction.status !== 'pending') throw new ApiError(400, 'Top-up is not awaiting verification');

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const valid = razorpayService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment verification failed');

  transaction.status = 'success';
  transaction.gatewayRef = razorpayPaymentId;
  transaction.meta = { ...transaction.meta, gatewayPaymentId: razorpayPaymentId };
  await transaction.save();

  const wallet = await getOrCreateWallet(req.user._id);
  wallet.balance += transaction.amount;
  await wallet.save();

  res.json({ success: true, transaction, wallet });
});

// --- Withdraw to Bank ---
//
// Two-phase, mirroring the demo payment/top-up pattern already used
// elsewhere: `initiate` reserves the funds (atomically, so it's safe under
// concurrent requests), `demo/complete` simulates the payout provider's
// eventual callback. No real payment provider is integrated for payouts -
// see the final report - so this never contacts a real bank; it exists so
// the whole wallet/withdrawal architecture (reservation, idempotency,
// status lifecycle, wallet restoration on failure) is real and testable,
// with only the very last "money actually moves" step left as an explicit,
// clearly-labeled stub a real payout integration can replace.
const initiateWithdrawal = asyncHandler(async (req, res) => {
  const amount = req.body.amount;

  const verified = await getVerifiedBankAccount(req.user._id);
  if (!verified) {
    throw new ApiError(400, 'Add your bank account details before withdrawing');
  }
  if (verified.kyc.status !== 'approved') {
    throw new ApiError(400, 'Please add and verify your own bank account before withdrawing');
  }

  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      // The atomic guard (`balance: {$gte: amount}` in the filter) is what
      // makes this safe against a user firing multiple withdrawal requests
      // at once for more than they actually have - see
      // walletService.reserveWithdrawal.
      const wallet = await walletService.reserveWithdrawal({ userId: req.user._id, amount, session });
      if (!wallet) {
        throw new ApiError(400, 'You do not have enough available balance for this withdrawal');
      }

      const [created] = await Transaction.create(
        [{
          wallet: wallet._id,
          user: req.user._id,
          type: 'withdrawal',
          amount,
          status: 'processing',
          gateway: 'demo',
          meta: {
            accountHolderName: verified.bank.accountHolderName,
            accountNumberMasked: maskAccountNumber(verified.bank.accountNumber),
            ifsc: verified.bank.ifsc,
          },
        }],
        { session }
      );
      transaction = created;
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ success: true, transactionId: transaction._id, status: transaction.status, amount });
});

// Simulates the payout provider confirming (or failing) the bank transfer.
// Idempotent: once a withdrawal leaves `processing`, retrying this is a
// no-op that just returns the already-settled transaction, and the atomic
// `findOneAndUpdate(..., status: 'processing', ...)` guard means at most one
// concurrent/retried call can ever apply the outcome.
const completeWithdrawalDemo = asyncHandler(async (req, res) => {
  const existing = await Transaction.findOne({ _id: req.params.transactionId, user: req.user._id, type: 'withdrawal' });
  if (!existing) throw new ApiError(404, 'Withdrawal not found');
  if (existing.status !== 'processing') {
    return res.json({ success: true, transaction: existing });
  }

  const outcome = demoPaymentService.decideOutcome(req.body.outcome) === 'failed' ? 'failed' : 'success';

  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const update =
        outcome === 'failed'
          ? { $set: { status: 'failed', 'meta.failureReason': demoPaymentService.randomFailureReason() } }
          : { $set: { status: 'success', 'meta.payoutRef': demoPaymentService.generatePayoutRef() } };

      const guarded = await Transaction.findOneAndUpdate(
        { _id: existing._id, status: 'processing' },
        update,
        { new: true, session }
      );
      if (!guarded) throw new ApiError(400, 'This withdrawal has already been processed');
      transaction = guarded;

      if (outcome === 'failed') {
        await walletService.finalizeWithdrawalFailure({ userId: req.user._id, amount: guarded.amount, session });
      } else {
        await walletService.finalizeWithdrawalSuccess({ userId: req.user._id, amount: guarded.amount, session });
      }
    });
  } finally {
    await session.endSession();
  }

  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ success: true, transaction, wallet });
});

module.exports = {
  getMyWallet,
  initiateTopup,
  completeTopupDemo,
  verifyTopupRazorpay,
  initiateWithdrawal,
  completeWithdrawalDemo,
};
