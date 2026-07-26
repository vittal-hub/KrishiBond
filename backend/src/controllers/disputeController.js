const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Dispute = require('../models/Dispute');
const { notifyUser } = require('../utils/notify');
const { assertParty, logEvent } = require('./contractController');

const listDisputes = asyncHandler(async (req, res) => {
  const contracts = await Contract.find({ $or: [{ farmer: req.user._id }, { buyer: req.user._id }] }).select('_id');
  const contractIds = contracts.map((c) => c._id);

  const filter = req.user.role === 'admin' ? {} : { contract: { $in: contractIds } };
  const disputes = await Dispute.find(filter).populate('raisedBy', 'name').sort({ createdAt: -1 });
  res.json({ success: true, disputes });
});

const createDispute = asyncHandler(async (req, res) => {
  const { contractId, reason, evidenceUrls } = req.body;
  const contract = await Contract.findById(contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const dispute = await Dispute.create({
    contract: contract._id,
    raisedBy: req.user._id,
    reason,
    evidenceUrls: evidenceUrls || [],
  });

  contract.status = 'disputed';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'dispute_raised', reason);

  const counterpart = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;
  await notifyUser(req.app.get('io'), counterpart, {
    type: 'dispute_raised',
    message: `A dispute was raised on your contract`,
    link: `/disputes/${dispute._id}`,
  });

  res.status(201).json({ success: true, dispute });
});

const getDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id)
    .populate('raisedBy', 'name')
    .populate('comments.author', 'name');
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const contract = await Contract.findById(dispute.contract);
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);

  res.json({ success: true, dispute, contract });
});

const addComment = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const contract = await Contract.findById(dispute.contract);
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);

  dispute.comments.push({ author: req.user._id, text: req.body.text });
  await dispute.save();
  await dispute.populate('comments.author', 'name');

  res.status(201).json({ success: true, dispute });
});

// Admin-only resolution
const resolveDispute = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Only admins can resolve disputes');
  const { status, resolutionNote } = req.body;
  const allowed = ['resolved', 'rejected', 'under_review'];
  if (!allowed.includes(status)) throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  dispute.status = status;
  dispute.resolutionNote = resolutionNote;
  await dispute.save();

  if (status === 'resolved') {
    await Contract.findByIdAndUpdate(dispute.contract, { status: 'active' });
  }

  res.json({ success: true, dispute });
});

module.exports = { listDisputes, createDispute, getDispute, addComment, resolveDispute };
