const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const { notifyUser } = require('../utils/notify');
const { logEvent, assertParty } = require('./contractController');

const listPayments = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const payments = await Payment.find({ contract: contract._id }).sort({ createdAt: -1 });
  res.json({ success: true, payments });
});

// Buyer funds escrow for a contract
const fundEscrow = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.buyer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the buyer can fund escrow');
  }

  // Payment gateway integration point: this stubs a successful charge and
  // records a reference id, since no real gateway credentials are configured.
  const escrowRef = `ESC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const payment = await Payment.create({
    contract: contract._id,
    payer: req.user._id,
    payee: contract.farmer,
    amount: req.body.amount,
    status: 'held',
    escrowRef,
  });

  await logEvent(contract._id, req.user._id, 'escrow_funded', `Held ${req.body.amount} in escrow`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_funded',
    message: `Buyer funded escrow for contract`,
    link: `/contracts/${contract._id}`,
  });

  res.status(201).json({ success: true, payment });
});

// Release escrow to the farmer once milestones/fulfilment are confirmed
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

  payment.status = 'released';
  payment.releasedAt = new Date();
  await payment.save();

  await logEvent(contract._id, req.user._id, 'escrow_released', `Released ${payment.amount} to farmer`);
  await notifyUser(req.app.get('io'), contract.farmer, {
    type: 'escrow_released',
    message: `Escrow payment of ${payment.amount} released to you`,
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, payment });
});

module.exports = { listPayments, fundEscrow, releaseEscrow };
