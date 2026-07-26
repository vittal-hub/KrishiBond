const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Bid = require('../models/Bid');
const { notifyUser } = require('../utils/notify');
const { logEvent, assertParty } = require('./contractController');

const listBids = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const bids = await Bid.find({ contract: contract._id }).populate('proposedBy', 'name role').sort({ createdAt: -1 });
  res.json({ success: true, bids });
});

const createBid = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Bidding is only open while contract is pending');

  const bid = await Bid.create({
    contract: contract._id,
    proposedBy: req.user._id,
    pricePerUnit: req.body.pricePerUnit,
    quantity: req.body.quantity,
    message: req.body.message,
  });

  await logEvent(contract._id, req.user._id, 'bid_placed', `Bid at ${req.body.pricePerUnit}/unit`);

  const counterpart = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;
  await notifyUser(req.app.get('io'), counterpart, {
    type: 'bid_placed',
    message: `New price offer of ${req.body.pricePerUnit}/unit`,
    link: `/contracts/${contract._id}`,
  });

  res.status(201).json({ success: true, bid });
});

const respondToBid = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  const bid = await Bid.findById(req.params.bidId);
  if (!bid) throw new ApiError(404, 'Bid not found');

  const contract = await Contract.findById(bid.contract);
  assertParty(contract, req.user._id);

  if (bid.proposedBy.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot respond to your own bid');
  }

  bid.status = action === 'accept' ? 'accepted' : 'rejected';
  await bid.save();

  if (action === 'accept') {
    contract.agreedPricePerUnit = bid.pricePerUnit;
    contract.quantity = bid.quantity;
    contract.status = 'active';
    await contract.save();
    await logEvent(contract._id, req.user._id, 'bid_accepted', `Agreed at ${bid.pricePerUnit}/unit`);
  } else {
    await logEvent(contract._id, req.user._id, 'bid_rejected', 'Offer rejected');
  }

  await notifyUser(req.app.get('io'), bid.proposedBy, {
    type: 'bid_response',
    message: `Your offer was ${bid.status}`,
    link: `/contracts/${contract._id}`,
  });

  res.json({ success: true, bid, contract });
});

module.exports = { listBids, createBid, respondToBid };
