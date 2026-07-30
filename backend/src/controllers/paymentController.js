const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const { notifyUser } = require('../utils/notify');
const { recordAudit } = require('../utils/auditLog');
const { logEvent, assertParty } = require('./contractController');
const walletService = require('../services/wallet.service');
const razorpayService = require('../services/razorpay.service');
const demoPaymentService = require('../services/demoPayment.service');
const { toPaymentDTO } = require('../utils/dto');
const { razorpay: razorpayConfig } = require('../config/env');

const listPayments = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const payments = await Payment.find({ contract: contract._id }).sort({ createdAt: -1 });
  res.json({ success: true, payments });
});

// Every payment the current user was involved in (as buyer or farmer),
// across all their contracts - powers the Payment History page.
const listMyPaymentHistory = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const PAYMENT_STATUSES = ['pending', 'held', 'released', 'refunded', 'failed'];
  const filter = { $or: [{ payer: req.user._id }, { payee: req.user._id }] };
  if (typeof status === 'string' && PAYMENT_STATUSES.includes(status)) filter.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('contract', 'cropType')
      .populate('payer', 'name')
      .populate('payee', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    payments: payments.map(toPaymentDTO),
    meta: { page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)), total },
  });
});

// Buyer funds escrow for a contract. If Razorpay is configured, this creates
// a real order and the frontend must complete checkout then call
// `verifyPayment`; otherwise it stubs an instant "held" payment so the rest
// of the app is fully testable without gateway credentials.
const fundEscrow = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.buyer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the buyer can fund escrow');
  }
  if (contract.status !== 'active') {
    throw new ApiError(400, 'Escrow can only be funded for an active contract');
  }

  const { amount } = req.body;

  if (razorpayService.isConfigured) {
    const order = await razorpayService.createOrder({
      amount,
      receipt: `contract-${contract._id}`,
      notes: { contractId: contract._id.toString() },
    });
    const payment = await Payment.create({
      contract: contract._id,
      payer: req.user._id,
      payee: contract.farmer,
      amount,
      status: 'pending',
      gateway: 'razorpay',
      gatewayOrderId: order.id,
    });

    return res.status(201).json({
      success: true,
      payment,
      gateway: 'razorpay',
      razorpayOrderId: order.id,
      razorpayKeyId: razorpayConfig.keyId,
      amount,
    });
  }

  const escrowRef = `ESC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const payment = await Payment.create({
    contract: contract._id,
    payer: req.user._id,
    payee: contract.farmer,
    amount,
    status: 'held',
    escrowRef,
    gateway: 'stub',
  });

  await walletService.recordEscrowFund({
    buyerId: req.user._id,
    amount,
    payment,
    contract,
    gateway: 'stub',
    gatewayRef: escrowRef,
  });

  await logEvent(contract._id, req.user._id, 'escrow_funded', `Held ${amount} in escrow`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_funded',
    category: 'payment',
    message: 'Buyer funded escrow for contract',
    link: `/contracts/${contract._id}`,
  });

  res.status(201).json({ success: true, payment, gateway: 'stub' });
});

// --- Demo Payment Gateway (fully simulated, never contacts any real gateway) ---

// Creates a pending demo payment and returns everything the frontend's
// payment-simulation modal needs to render (merchant/contract summary).
const initiateDemoPayment = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId)
    .populate('farmer', 'name')
    .populate('buyer', 'name');
  if (!contract) throw new ApiError(404, 'Contract not found');
  // Populated above, so compare by ._id rather than the shared assertParty
  // helper (which expects plain ObjectId refs) - being the buyer implies
  // being a party, so this alone is a sufficient authorization check.
  if (contract.buyer._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the buyer can pay for this contract');
  }
  if (contract.status !== 'active') {
    throw new ApiError(400, 'Escrow can only be funded for an active contract');
  }

  const { amount } = req.body;
  const convenienceFee = 0;

  const payment = await Payment.create({
    contract: contract._id,
    payer: req.user._id,
    payee: contract.farmer._id,
    amount,
    convenienceFee,
    status: 'pending',
    gateway: 'demo',
    gatewayOrderId: demoPaymentService.generateFakeOrderId(),
  });

  res.status(201).json({
    success: true,
    payment: toPaymentDTO(payment),
    merchant: {
      name: 'KrishiBond',
      contractId: contract._id,
      farmerName: contract.farmer.name,
      buyerName: contract.buyer.name,
      cropType: contract.cropType,
      amount,
      convenienceFee,
      totalAmount: amount + convenienceFee,
    },
  });
});

// Finalizes a demo payment. `outcome` lets the demo UI's dev toggle force a
// result; otherwise it's a random 90% success / 10% failure roll - purely
// local simulation, no external gateway is ever contacted.
const completeDemoPayment = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const payment = await Payment.findOne({ _id: req.params.paymentId, contract: contract._id, gateway: 'demo' });
  if (!payment) throw new ApiError(404, 'Demo payment not found');
  if (payment.status !== 'pending') {
    return res.json({ success: true, payment: toPaymentDTO(payment) });
  }

  const { outcome: forcedOutcome, method, reason } = req.body;
  const outcome = demoPaymentService.decideOutcome(forcedOutcome);

  if (outcome === 'pending') {
    return res.json({ success: true, payment: toPaymentDTO(payment) });
  }

  if (outcome === 'failed') {
    payment.status = 'failed';
    payment.method = method;
    payment.failureReason = reason || demoPaymentService.randomFailureReason();
    await payment.save();

    await recordAudit(req, {
      action: 'DEMO_PAYMENT_FAILED',
      entityType: 'Payment',
      entityId: payment._id,
      after: { status: 'failed', reason: payment.failureReason },
    });

    return res.json({ success: true, payment: toPaymentDTO(payment) });
  }

  payment.status = 'held';
  payment.method = method;
  payment.gatewayPaymentId = demoPaymentService.generateFakePaymentId();
  payment.receiptNumber = demoPaymentService.generateReceiptNumber();
  payment.paidAt = new Date();
  await payment.save();

  await walletService.recordEscrowFund({
    buyerId: req.user._id,
    amount: payment.amount,
    payment,
    contract,
    gateway: 'demo',
    gatewayRef: payment.gatewayPaymentId,
  });

  await recordAudit(req, {
    action: 'DEMO_PAYMENT_SUCCESS',
    entityType: 'Payment',
    entityId: payment._id,
    after: { status: 'held', receiptNumber: payment.receiptNumber },
  });

  await logEvent(contract._id, req.user._id, 'escrow_funded', `Held ${payment.amount} in escrow (demo payment)`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_funded',
    category: 'payment',
    message: 'Buyer funded escrow for contract',
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, payment: toPaymentDTO(payment) });
});

// Confirms a Razorpay checkout by verifying its signature, then moves the
// payment from `pending` to `held` and credits the ledger. Idempotent: if a
// webhook already confirmed the same payment, this just returns success.
const verifyPayment = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const payment = await Payment.findOne({ _id: req.params.paymentId, contract: contract._id });
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status === 'held') {
    return res.json({ success: true, payment });
  }
  if (payment.status !== 'pending') throw new ApiError(400, 'Payment is not awaiting verification');

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const valid = razorpayService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment verification failed');

  payment.status = 'held';
  payment.gatewayPaymentId = razorpayPaymentId;
  await payment.save();

  await walletService.recordEscrowFund({
    buyerId: contract.buyer,
    amount: payment.amount,
    payment,
    contract,
    gateway: 'razorpay',
    gatewayRef: razorpayPaymentId,
  });

  await logEvent(contract._id, req.user._id, 'escrow_funded', `Held ${payment.amount} in escrow`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_funded',
    category: 'payment',
    message: 'Buyer funded escrow for contract',
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, payment });
});

// Public webhook (signature-verified, not session-authenticated) so escrow
// funding is confirmed even if the buyer's browser closes mid-checkout.
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!razorpayService.verifyWebhookSignature(req.rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = req.body;
  if (event.event === 'payment.captured') {
    const rpPayment = event.payload?.payment?.entity;
    const payment = rpPayment && (await Payment.findOne({ gatewayOrderId: rpPayment.order_id }));
    if (payment && payment.status === 'pending') {
      payment.status = 'held';
      payment.gatewayPaymentId = rpPayment.id;
      await payment.save();

      const contract = await Contract.findById(payment.contract);
      await walletService.recordEscrowFund({
        buyerId: payment.payer,
        amount: payment.amount,
        payment,
        contract,
        gateway: 'razorpay',
        gatewayRef: rpPayment.id,
      });
      await logEvent(payment.contract, payment.payer, 'escrow_funded', `Held ${payment.amount} in escrow (webhook)`);
      await notifyUser(req.app.get('io'), contract.farmer, {
        type: 'escrow_funded',
        category: 'payment',
        message: 'Buyer funded escrow for contract',
        link: `/contracts/${contract._id}`,
      });
    }
  }

  res.json({ success: true });
});

// Release escrow to the farmer once milestones/fulfilment are confirmed.
// Supports partial (milestone-split) release via an optional `amount`.
const releaseEscrow = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.buyer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the buyer can release escrow');
  }

  const payment = await Payment.findOne({ _id: req.params.paymentId, contract: contract._id });
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status !== 'held') throw new ApiError(400, 'Payment is not in a releasable state');

  const releaseAmount = req.body.amount !== undefined ? Number(req.body.amount) : payment.amount;
  if (!(releaseAmount > 0) || releaseAmount > payment.amount) {
    throw new ApiError(400, 'Release amount must be greater than 0 and not exceed the held amount');
  }

  let releasedPayment;
  if (releaseAmount < payment.amount) {
    payment.amount -= releaseAmount;
    await payment.save();
    releasedPayment = await Payment.create({
      contract: contract._id,
      payer: payment.payer,
      payee: payment.payee,
      amount: releaseAmount,
      status: 'released',
      gateway: payment.gateway,
      gatewayOrderId: payment.gatewayOrderId,
      releasedAt: new Date(),
    });
  } else {
    payment.status = 'released';
    payment.releasedAt = new Date();
    await payment.save();
    releasedPayment = payment;
  }

  await walletService.recordEscrowRelease({
    farmerId: contract.farmer,
    buyerId: contract.buyer,
    amount: releaseAmount,
    payment: releasedPayment,
    contract,
    gateway: payment.gateway,
    gatewayRef: `release-${releasedPayment._id}`,
  });

  await logEvent(contract._id, req.user._id, 'escrow_released', `Released ${releaseAmount} to farmer`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_released',
    category: 'payment',
    message: `Escrow payment of ${releaseAmount} released to you`,
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, payment: releasedPayment });
});

// Admin-only: refund a held payment back to the buyer (e.g. cancelled/disputed contract).
const refundEscrow = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');

  const payment = await Payment.findOne({ _id: req.params.paymentId, contract: contract._id });
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status !== 'held') throw new ApiError(400, 'Only held payments can be refunded');

  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();

  await recordAudit(req, {
    action: 'PAYMENT_REFUND',
    entityType: 'Payment',
    entityId: payment._id,
    before: { status: 'held' },
    after: { status: 'refunded', amount: payment.amount },
  });

  await walletService.recordRefund({
    buyerId: contract.buyer,
    amount: payment.amount,
    payment,
    contract,
    gateway: payment.gateway,
    gatewayRef: `refund-${payment._id}`,
  });

  await logEvent(contract._id, req.user._id, 'escrow_refunded', `Refunded ${payment.amount} to buyer`);
  await notifyUser(req.app.get('io'), contract.buyer, {
    type: 'escrow_refunded',
    category: 'payment',
    message: `Refund of ${payment.amount} has been issued`,
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, payment });
});

module.exports = {
  listPayments,
  listMyPaymentHistory,
  fundEscrow,
  initiateDemoPayment,
  completeDemoPayment,
  verifyPayment,
  razorpayWebhook,
  releaseEscrow,
  refundEscrow,
};
