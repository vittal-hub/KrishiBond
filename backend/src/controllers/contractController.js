const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Listing = require('../models/Listing');
const TimelineEvent = require('../models/TimelineEvent');
const { notifyUser } = require('../utils/notify');
const { toContractDTO, toTimelineDTO } = require('../utils/dto');

async function logEvent(contractId, actorId, type, detail) {
  await TimelineEvent.create({ contract: contractId, actor: actorId, type, detail });
}

// `contract.farmer`/`contract.buyer` are sometimes plain ObjectIds and
// sometimes populated User documents (when the caller populated them before
// this check, e.g. disputeController.getDispute). Comparing a populated
// document with `.toString()` doesn't yield its id, so this always resolves
// the underlying id first regardless of population state.
function idOf(ref) {
  return (ref && ref._id ? ref._id : ref).toString();
}

function assertParty(contract, userId) {
  const isParty = [contract.farmer, contract.buyer].some((id) => idOf(id) === userId.toString());
  if (!isParty) throw new ApiError(403, 'Not a party to this contract');
}

// Both parties must digitally sign before a contract can move from `pending` to `active`.
function bothPartiesSigned(contract) {
  return Boolean(contract.signatures?.farmer?.signedAt && contract.signatures?.buyer?.signedAt);
}

async function notifyCounterpart(req, contract, payload) {
  const counterpartId = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;
  await notifyUser(req.app.get('io'), counterpartId, { category: 'contract', ...payload });
}

const CONTRACT_STATUSES = ['pending', 'active', 'fulfilled', 'disputed', 'cancelled'];

const listContracts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { $or: [{ farmer: req.user._id }, { buyer: req.user._id }] };
  if (typeof status === 'string' && CONTRACT_STATUSES.includes(status)) filter.status = status;

  const contracts = await Contract.find(filter)
    .populate('farmer', 'name')
    .populate('buyer', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, contracts: contracts.map(toContractDTO) });
});

const createContract = asyncHandler(async (req, res) => {
  const {
    listingId,
    buyerId,
    farmerId,
    cropType,
    quantity,
    unit,
    agreedPricePerUnit,
    deliveryDate,
    village,
    terms,
    startDate,
    endDate,
  } = req.body;

  let farmer = farmerId;
  let listing = null;

  // A buyer must always propose against a real, currently-open produce
  // listing - the farmer is derived from *that listing's owner*, never from
  // a client-supplied farmerId. This is what prevents a buyer from sending a
  // proposal to an arbitrary/unrelated "farmer" account by hand-crafting a
  // request (see contractValidators.createContractSchema - farmerId is
  // still accepted in the body shape for the farmer-initiated path below,
  // but is deliberately ignored here).
  if (req.user.role === 'buyer') {
    if (!listingId) {
      throw new ApiError(400, 'Select a produce listing from the marketplace to send a proposal');
    }
    listing = await Listing.findById(listingId);
    if (!listing) throw new ApiError(404, 'Listing not found');
    if (listing.status !== 'open') {
      throw new ApiError(400, 'This listing is no longer open for proposals');
    }
    if (quantity > listing.quantity) {
      throw new ApiError(400, `Requested quantity exceeds the available quantity (${listing.quantity} ${listing.unit})`);
    }
    farmer = listing.owner;
  } else if (listingId) {
    // Non-buyer creation paths (e.g. an admin/farmer tool) may still supply
    // a listingId directly; kept for parity with the pre-existing behavior.
    listing = await Listing.findById(listingId);
    if (!listing) throw new ApiError(404, 'Listing not found');
    farmer = listing.owner;
  }

  const buyer = req.user.role === 'buyer' ? req.user._id : buyerId;
  const farmerFinal = req.user.role === 'farmer' ? req.user._id : farmer;

  if (!buyer || !farmerFinal) throw new ApiError(400, 'Both farmer and buyer must be identified');

  const contract = await Contract.create({
    listing: listing?._id,
    farmer: farmerFinal,
    buyer,
    cropType,
    quantity,
    unit,
    agreedPricePerUnit,
    deliveryDate,
    village,
    terms,
    startDate,
    endDate,
    status: 'pending',
  });

  if (listing) {
    listing.status = 'matched';
    await listing.save();
  }

  await logEvent(contract._id, req.user._id, 'contract_created', 'Contract proposed');

  const counterpartId = req.user._id.toString() === buyer.toString() ? farmerFinal : buyer;
  await notifyUser(req.app.get('io'), counterpartId, {
    type: 'contract_proposed',
    category: 'contract',
    message: `New contract proposal for ${cropType}`,
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.status(201).json({ success: true, contract: toContractDTO(contract) });
});

const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('farmer', 'name email phone')
    .populate('buyer', 'name email phone');
  if (!contract) throw new ApiError(404, 'Contract not found');

  const isParty = [contract.farmer._id, contract.buyer._id].some((id) => id.toString() === req.user._id.toString());
  if (!isParty && req.user.role !== 'admin') throw new ApiError(403, 'Not a party to this contract');

  const timeline = await TimelineEvent.find({ contract: contract._id }).populate('actor', 'name').sort({ createdAt: 1 });
  res.json({ success: true, contract: toContractDTO(contract), timeline: timeline.map(toTimelineDTO) });
});

// Pending milestones across all of the user's active contracts, soonest due
// date first - powers the dashboard's "upcoming" widget (FR-FARM-8/FR-DASH-1).
const getUpcomingMilestones = asyncHandler(async (req, res) => {
  const contracts = await Contract.find({
    $or: [{ farmer: req.user._id }, { buyer: req.user._id }],
    status: 'active',
    'milestones.status': 'pending',
  }).select('cropType milestones');

  const items = [];
  contracts.forEach((contract) => {
    contract.milestones
      .filter((m) => m.status === 'pending')
      .forEach((m) => {
        items.push({
          contractId: contract._id,
          cropType: contract.cropType,
          milestoneId: m._id,
          title: m.title,
          dueDate: m.dueDate,
        });
      });
  });

  items.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  res.json({ success: true, milestones: items.slice(0, 10) });
});

const getTimeline = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  if (req.user.role !== 'admin') assertParty(contract, req.user._id);

  const timeline = await TimelineEvent.find({ contract: contract._id }).populate('actor', 'name').sort({ createdAt: 1 });
  res.json({ success: true, timeline: timeline.map(toTimelineDTO) });
});

// Generic status transition (kept for admin/API use); prefer the accept/reject/cancel
// endpoints below for normal party-driven lifecycle actions.
const updateContractStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'fulfilled', 'cancelled'];
  if (!allowed.includes(status)) throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);

  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  if (status === 'active' && !bothPartiesSigned(contract)) {
    throw new ApiError(400, 'Both parties must digitally sign before the contract can be activated');
  }

  contract.status = status;
  await contract.save();
  await logEvent(contract._id, req.user._id, 'status_changed', `Status set to ${status}`);
  await notifyCounterpart(req, contract, {
    type: 'contract_status',
    message: `Contract status changed to ${status}`,
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

const acceptContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Only pending contracts can be accepted');
  if (!bothPartiesSigned(contract)) {
    throw new ApiError(400, 'Both parties must digitally sign before the contract can be accepted');
  }

  contract.status = 'active';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'contract_accepted', 'Contract terms accepted by both parties');
  await notifyCounterpart(req, contract, {
    type: 'contract_accepted',
    message: 'Contract has been accepted and is now active',
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

// Either party marks an active contract as fulfilled once delivery/payment is
// done - this is what unlocks leaving a review for the other party.
const completeContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'active') throw new ApiError(400, 'Only active contracts can be marked fulfilled');

  contract.status = 'fulfilled';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'contract_fulfilled', 'Contract marked as fulfilled');
  await notifyCounterpart(req, contract, {
    type: 'contract_fulfilled',
    message: 'Contract was marked as fulfilled - you can now leave a review',
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

const rejectContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Only pending contracts can be rejected');

  contract.status = 'cancelled';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'contract_rejected', req.body.reason || 'Contract rejected');
  await notifyCounterpart(req, contract, {
    type: 'contract_status',
    message: 'Contract proposal was rejected',
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

const cancelContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (!['pending', 'active'].includes(contract.status)) {
    throw new ApiError(400, 'Only pending or active contracts can be cancelled');
  }

  contract.status = 'cancelled';
  await contract.save();
  await logEvent(contract._id, req.user._id, 'contract_cancelled', req.body.reason || 'Contract cancelled');
  await notifyCounterpart(req, contract, {
    type: 'contract_status',
    message: 'Contract was cancelled',
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

const signContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Only pending contracts can be signed');

  // `signatureUrl` always comes from the authenticated user's own saved
  // profile signature, never from the request body - a party can only ever
  // sign with their own signature, not one submitted directly by the client.
  const side = contract.farmer.toString() === req.user._id.toString() ? 'farmer' : 'buyer';
  contract.signatures[side] = {
    signedAt: new Date(),
    signatureName: req.body.signatureName || req.user.name,
    signatureUrl: req.user.signatureUrl || undefined,
  };
  await contract.save();
  await logEvent(contract._id, req.user._id, 'contract_signed', `${req.user.name} signed the contract`);
  await notifyCounterpart(req, contract, {
    type: 'contract_signed',
    message: `${req.user.name} signed the contract`,
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

const addClause = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Clauses can only be added while the contract is pending');

  contract.customClauses.push(req.body.text);
  await contract.save();
  await logEvent(contract._id, req.user._id, 'clause_added', req.body.text);

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.status(201).json({ success: true, contract: toContractDTO(contract) });
});

const addMilestone = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  contract.milestones.push({ title: req.body.title, dueDate: req.body.dueDate });
  await contract.save();
  await logEvent(contract._id, req.user._id, 'milestone_added', req.body.title);

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.status(201).json({ success: true, contract: toContractDTO(contract) });
});

const completeMilestone = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const milestone = contract.milestones.id(req.params.milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  milestone.status = 'completed';
  milestone.completedAt = new Date();
  await contract.save();
  await logEvent(contract._id, req.user._id, 'milestone_completed', milestone.title);

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, contract: toContractDTO(contract) });
});

module.exports = {
  listContracts,
  createContract,
  getContract,
  getUpcomingMilestones,
  getTimeline,
  updateContractStatus,
  acceptContract,
  completeContract,
  rejectContract,
  cancelContract,
  signContract,
  addClause,
  addMilestone,
  completeMilestone,
  logEvent,
  assertParty,
  bothPartiesSigned,
};
