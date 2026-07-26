const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Listing = require('../models/Listing');
const Contract = require('../models/Contract');
const { toListingDTO } = require('../utils/dto');

const searchListings = asyncHandler(async (req, res) => {
  const { cropType, state, district, status = 'open', page = 1, limit = 20 } = req.query;
  const filter = { status };
  if (cropType) filter.cropType = new RegExp(cropType, 'i');
  if (state) filter['location.state'] = new RegExp(state, 'i');
  if (district) filter['location.district'] = new RegExp(district, 'i');

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .populate('owner', 'name role location')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Listing.countDocuments(filter),
  ]);

  res.json({
    success: true,
    listings: listings.map(toListingDTO),
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

const createListing = asyncHandler(async (req, res) => {
  if (req.user.role !== 'farmer') throw new ApiError(403, 'Only farmers can create listings');
  const listing = await Listing.create({ ...req.body, owner: req.user._id });
  await listing.populate('owner', 'name role location');
  res.status(201).json({ success: true, listing: toListingDTO(listing) });
});

const getListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('owner', 'name role location');
  if (!listing) throw new ApiError(404, 'Listing not found');
  res.json({ success: true, listing: toListingDTO(listing) });
});

const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not own this listing');
  }
  Object.assign(listing, req.body);
  await listing.save();
  await listing.populate('owner', 'name role location');
  res.json({ success: true, listing: toListingDTO(listing) });
});

const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not own this listing');
  }
  await listing.deleteOne();
  res.json({ success: true, message: 'Listing deleted' });
});

// Suggested matches for the logged in user's dashboard
const getMatches = asyncHandler(async (req, res) => {
  const filter = { status: 'open' };
  if (req.user.role === 'buyer' && req.user.location?.state) {
    filter['location.state'] = req.user.location.state;
  }
  if (req.user.role === 'farmer') {
    // farmers see nothing here by default (buyers post demand elsewhere in a fuller build);
    // for now surface other open listings in the same region as a simple heuristic.
    filter.owner = { $ne: req.user._id };
  }
  const listings = await Listing.find(filter)
    .populate('owner', 'name role location')
    .sort({ createdAt: -1 })
    .limit(10);
  res.json({ success: true, matches: listings.map(toListingDTO) });
});

// Aggregate average agreed price per unit from historical contracts as a market benchmark
const getPriceBenchmark = asyncHandler(async (req, res) => {
  const { cropType } = req.query;
  if (!cropType) throw new ApiError(400, 'cropType query param is required');

  const stats = await Contract.aggregate([
    { $match: { cropType: new RegExp(`^${cropType}$`, 'i'), agreedPricePerUnit: { $gt: 0 } } },
    {
      $group: {
        _id: '$cropType',
        avgPrice: { $avg: '$agreedPricePerUnit' },
        minPrice: { $min: '$agreedPricePerUnit' },
        maxPrice: { $max: '$agreedPricePerUnit' },
        sampleSize: { $sum: 1 },
      },
    },
  ]);

  const result = stats[0] || {
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    sampleSize: 0,
  };

  res.json({ success: true, benchmark: { cropType, ...result } });
});

module.exports = {
  searchListings,
  createListing,
  getListing,
  updateListing,
  deleteListing,
  getMatches,
  getPriceBenchmark,
};
