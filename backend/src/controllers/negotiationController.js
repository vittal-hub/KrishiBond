const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Bid = require('../models/Bid');
const { notifyUser } = require('../utils/notify');
const { toBidDTO, toContractDTO } = require('../utils/dto');
const { logEvent, assertParty } = require('./contractController');

const listBids = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const bids = await Bid.find({ contract: contract._id }).populate('proposedBy', 'name role').sort({ createdAt: -1 });
  res.json({ success: true, bids: bids.map(toBidDTO) });
});

const createBid = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'Negotiation is only open while the contract is pending');

  const bid = await Bid.create({
    contract: contract._id,
    proposedBy: req.user._id,
    pricePerUnit: req.body.pricePerUnit,
    quantity: req.body.quantity,
    message: req.body.message,
  });
  await bid.populate('proposedBy', 'name role');

  await logEvent(contract._id, req.user._id, 'bid_placed', `Bid at ${req.body.pricePerUnit}/unit`);

  const counterpart = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;
  await notifyUser(req.app.get('io'), counterpart, {
    type: 'bid_placed',
    category: 'offer',
    message: `New price offer of ${req.body.pricePerUnit}/unit`,
    link: `/contracts/${contract._id}`,
  });

  res.status(201).json({ success: true, bid: toBidDTO(bid) });
});

const respondToBid = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  const bid = await Bid.findById(req.params.bidId).populate('proposedBy', 'name role');
  if (!bid) throw new ApiError(404, 'Bid not found');

  const contract = await Contract.findById(bid.contract);
  assertParty(contract, req.user._id);
  if (contract.status !== 'pending') throw new ApiError(400, 'This contract is no longer open for negotiation');

  if (bid.proposedBy._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot respond to your own bid');
  }
  if (bid.status !== 'pending') throw new ApiError(400, 'This offer has already been responded to');

  bid.status = action === 'accept' ? 'accepted' : 'rejected';
  await bid.save();

  if (action === 'accept') {
    // Accepting a counter-offer locks in the agreed terms but does not skip
    // the digital-signature step - both parties still sign, then accept the
    // contract to move it to `active` (see contractController.acceptContract).
    contract.agreedPricePerUnit = bid.pricePerUnit;
    contract.quantity = bid.quantity;
    await contract.save();
    await logEvent(contract._id, req.user._id, 'bid_accepted', `Agreed at ${bid.pricePerUnit}/unit`);
  } else {
    await logEvent(contract._id, req.user._id, 'bid_rejected', 'Offer rejected');
  }

  await notifyUser(req.app.get('io'), bid.proposedBy._id, {
    type: 'bid_response',
    category: 'offer',
    message: `Your offer was ${bid.status}`,
    link: `/contracts/${contract._id}`,
  });

  await contract.populate('farmer', 'name');
  await contract.populate('buyer', 'name');
  res.json({ success: true, bid: toBidDTO(bid), contract: toContractDTO(contract) });
});

module.exports = { listBids, createBid, respondToBid };
