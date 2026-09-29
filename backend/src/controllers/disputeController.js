const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Dispute = require('../models/Dispute');
const { notifyUser } = require('../utils/notify');
const { recordAudit } = require('../utils/auditLog');
const { toDisputeDTO, toContractDTO } = require('../utils/dto');
const { uploadChatAttachment } = require('../services/upload.service');
const { assertParty, logEvent } = require('./contractController');

function otherContractParty(contract, userId) {
  return contract.farmer.toString() === userId.toString() ? contract.buyer : contract.farmer;
}

const listDisputes = asyncHandler(async (req, res) => {
  const contracts = await Contract.find({ $or: [{ farmer: req.user._id }, { buyer: req.user._id }] }).select('_id');
  const contractIds = contracts.map((c) => c._id);

  const filter = req.user.role === 'admin' ? {} : { contract: { $in: contractIds } };
  const disputes = await Dispute.find(filter).populate('raisedBy', 'name').sort({ createdAt: -1 });
  res.json({ success: true, disputes: disputes.map(toDisputeDTO) });
});

const createDispute = asyncHandler(async (req, res) => {
  const { contractId, reason, evidenceUrls } = req.body;
  const contract = await Contract.findById(contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  // Only a contract that's actually in force can be disputed - a 'pending'
  // contract has no obligations yet, and 'fulfilled'/'cancelled'/'disputed'
  // are already terminal or already under dispute. Without this guard a
  // dispute could silently knock a completed contract back into 'disputed'.
  if (contract.status !== 'active') {
    throw new ApiError(400, `Cannot raise a dispute on a contract that is ${contract.status}`);
  }

  const dispute = await Dispute.create({
    contract: contract._id,
    raisedBy: req.user._id,
    reason,
    evidenceUrls: evidenceUrls || [],
    previousContractStatus: contract.status,
  });
  await dispute.populate('raisedBy', 'name');

  contract.status = 'disputed';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'dispute_raised', reason);

  await notifyUser(req.app.get('io'), otherContractParty(contract, req.user._id), {
    type: 'dispute_raised',
    category: 'dispute',
    message: 'A dispute was raised on your contract',
    link: `/disputes/${dispute._id}`,
  });

  res.status(201).json({ success: true, dispute: toDisputeDTO(dispute) });
});

const getDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id)
    .populate('raisedBy', 'name')
    .populate('comments.author', 'name');
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const contract = await Contract.findById(dispute.contract).populate('farmer', 'name').populate('buyer', 'name');
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);

  res.json({ success: true, dispute: toDisputeDTO(dispute), contract: contract ? toContractDTO(contract) : null });
});

const addComment = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const contract = await Contract.findById(dispute.contract);
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);

  dispute.comments.push({ author: req.user._id, text: req.body.text });
  await dispute.save();
  await dispute.populate('comments.author', 'name');
  await dispute.populate('raisedBy', 'name');

  const notifyTargets =
    req.user.role === 'admin'
      ? [contract.farmer, contract.buyer]
      : [otherContractParty(contract, req.user._id)];

  await Promise.all(
    notifyTargets.map((userId) =>
      notifyUser(req.app.get('io'), userId, {
        type: 'dispute_comment',
        category: 'dispute',
        message: `New comment on your dispute: "${dispute.reason}"`,
        link: `/disputes/${dispute._id}`,
      })
    )
  );

  res.status(201).json({ success: true, dispute: toDisputeDTO(dispute) });
});

const addEvidence = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const contract = await Contract.findById(dispute.contract);
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);
  if (!req.file) throw new ApiError(400, 'No file was provided');

  const { url } = await uploadChatAttachment(req.file, `krishibond/disputes/${dispute._id}`);
  dispute.evidenceUrls.push(url);
  await dispute.save();
  await dispute.populate('raisedBy', 'name');
  await dispute.populate('comments.author', 'name');

  res.status(201).json({ success: true, dispute: toDisputeDTO(dispute) });
});

// Admin-only resolution
const resolveDispute = asyncHandler(async (req, res) => {
  const { status, resolutionNote } = req.body;

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  const beforeStatus = dispute.status;
  dispute.status = status;
  dispute.resolutionNote = resolutionNote;
  await dispute.save();
  await dispute.populate('raisedBy', 'name');
  await dispute.populate('comments.author', 'name');

  await recordAudit(req, {
    action: 'DISPUTE_RESOLVE',
    entityType: 'Dispute',
    entityId: dispute._id,
    before: { status: beforeStatus },
    after: { status, resolutionNote },
  });

  // 'resolved' and 'rejected' are terminal outcomes - either way the dispute
  // is over and the contract should return to whatever state it was in
  // before the dispute was raised, rather than being left stuck as
  // 'disputed' forever (previously only 'resolved' restored the contract,
  // and always to a hardcoded 'active').
  const contract = await Contract.findById(dispute.contract);
  if (contract && contract.status === 'disputed' && ['resolved', 'rejected'].includes(status)) {
    contract.status = dispute.previousContractStatus || 'active';
    await contract.save();
  }

  if (contract) {
    await Promise.all(
      [contract.farmer, contract.buyer].map((userId) =>
        notifyUser(req.app.get('io'), userId, {
          type: 'dispute_resolved',
          category: 'dispute',
          message: `Your dispute was marked as ${status.replace('_', ' ')}`,
          link: `/disputes/${dispute._id}`,
        })
      )
    );
  }

  res.json({ success: true, dispute: toDisputeDTO(dispute) });
});

module.exports = { listDisputes, createDispute, getDispute, addComment, addEvidence, resolveDispute };
