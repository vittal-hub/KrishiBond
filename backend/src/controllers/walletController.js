const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Transaction = require('../models/Transaction');
const walletService = require('../services/wallet.service');
const razorpayService = require('../services/razorpay.service');
const demoPaymentService = require('../services/demoPayment.service');
const { razorpay: razorpayConfig } = require('../config/env');

const { getOrCreateWallet } = walletService;

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ success: true, wallet });
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

module.exports = { getMyWallet, initiateTopup, completeTopupDemo, verifyTopupRazorpay };
