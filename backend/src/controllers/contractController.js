const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Listing = require('../models/Listing');
const TimelineEvent = require('../models/TimelineEvent');
const { notifyUser } = require('../utils/notify');

async function logEvent(contractId, actorId, type, detail) {
  await TimelineEvent.create({ contract: contractId, actor: actorId, type, detail });
}

const listContracts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { $or: [{ farmer: req.user._id }, { buyer: req.user._id }] };
  if (status) filter.status = status;

  const contracts = await Contract.find(filter)
    .populate('farmer', 'name')
    .populate('buyer', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, contracts });
});

const createContract = asyncHandler(async (req, res) => {
  const { listingId, buyerId, farmerId, cropType, quantity, unit, agreedPricePerUnit, startDate, endDate } = req.body;

  let farmer = farmerId;
  let listing = null;
  if (listingId) {
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
    message: `New contract proposal for ${cropType}`,
    link: `/contracts/${contract._id}`,
  });

  res.status(201).json({ success: true, contract });
});

const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('farmer', 'name email phone')
    .populate('buyer', 'name email phone');
  if (!contract) throw new ApiError(404, 'Contract not found');

  const isParty = [contract.farmer._id, contract.buyer._id].some((id) => id.toString() === req.user._id.toString());
  if (!isParty && req.user.role !== 'admin') throw new ApiError(403, 'Not a party to this contract');

  const timeline = await TimelineEvent.find({ contract: contract._id }).sort({ createdAt: 1 });
  res.json({ success: true, contract, timeline });
});

function assertParty(contract, userId) {
  const isParty = [contract.farmer, contract.buyer].some((id) => id.toString() === userId.toString());
  if (!isParty) throw new ApiError(403, 'Not a party to this contract');
}

const updateContractStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'fulfilled', 'cancelled'];
  if (!allowed.includes(status)) throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);

  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  contract.status = status;
  await contract.save();
  await logEvent(contract._id, req.user._id, 'status_changed', `Status set to ${status}`);

  const counterpart = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;
  await notifyUser(req.app.get('io'), counterpart, {
    type: 'contract_status',
    message: `Contract status changed to ${status}`,
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, contract });
});

const addMilestone = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  contract.milestones.push({ title: req.body.title, dueDate: req.body.dueDate });
  await contract.save();
  await logEvent(contract._id, req.user._id, 'milestone_added', req.body.title);

  res.status(201).json({ success: true, contract });
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

  res.json({ success: true, contract });
});

module.exports = {
  listContracts,
  createContract,
  getContract,
  updateContractStatus,
  addMilestone,
  completeMilestone,
  logEvent,
  assertParty,
};
