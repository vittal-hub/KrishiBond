const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const Contract = require('../models/Contract');
const { toListingDTO } = require('../utils/dto');
const { uploadImages } = require('../services/upload.service');
const { escapeRegex } = require('../utils/regex');

const SORT_MAP = {
  price: { pricePerUnit: 1 },
  '-price': { pricePerUnit: -1 },
  harvestDate: { harvestDate: 1 },
  '-harvestDate': { harvestDate: -1 },
  createdAt: { createdAt: 1 },
  '-createdAt': { createdAt: -1 },
};

const LISTING_STATUSES = ['open', 'matched', 'closed'];

// The frontend dropdown only ever offers real, active category ids, but the
// backend can't trust that a request actually came from it - without this, a
// crafted request could set `category` to an arbitrary/nonexistent ObjectId
// and Mongoose would happily store the dangling reference.
async function assertValidCategory(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') return;
  if (!mongoose.isValidObjectId(categoryId)) throw new ApiError(400, 'Invalid category');
  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) throw new ApiError(400, 'Unknown or inactive category');
}

const searchListings = asyncHandler(async (req, res) => {
  const {
    cropType,
    category,
    state,
    district,
    q,
    organic,
    minPrice,
    maxPrice,
    minQuantity,
    harvestFrom,
    harvestTo,
    status = 'open',
    sort = '-createdAt',
    page = 1,
    limit = 20,
  } = req.query;

  // Every query-string value here must be coerced to a primitive before use -
  // Express's query parser turns bracket syntax (?status[$ne]=x) into nested
  // objects, which would otherwise be assigned straight into the Mongo filter.
  const filter = { status: LISTING_STATUSES.includes(status) ? status : 'open' };
  if (cropType) filter.cropType = new RegExp(escapeRegex(cropType), 'i');
  if (category && mongoose.isValidObjectId(category)) filter.category = category;
  if (state) filter['location.state'] = new RegExp(escapeRegex(state), 'i');
  if (district) filter['location.district'] = new RegExp(escapeRegex(district), 'i');
  if (organic === 'true') filter.organic = true;
  if (typeof q === 'string' && q.trim()) filter.$text = { $search: q };

  if (minPrice || maxPrice) {
    filter.pricePerUnit = {};
    if (minPrice) filter.pricePerUnit.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerUnit.$lte = Number(maxPrice);
  }
  if (minQuantity) filter.quantity = { $gte: Number(minQuantity) };
  if (harvestFrom || harvestTo) {
    filter.harvestDate = {};
    if (harvestFrom) filter.harvestDate.$gte = new Date(harvestFrom);
    if (harvestTo) filter.harvestDate.$lte = new Date(harvestTo);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  const sortSpec = SORT_MAP[sort] || SORT_MAP['-createdAt'];

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .populate('owner', 'name role location')
      .populate('category', 'name slug')
      .sort(sortSpec)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Listing.countDocuments(filter),
  ]);

  res.json({
    success: true,
    listings: listings.map((l) => toListingDTO(l, req.user?._id)),
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  });
});

const createListing = asyncHandler(async (req, res) => {
  if (req.user.role !== 'farmer') throw new ApiError(403, 'Only farmers can create listings');
  await assertValidCategory(req.body.category);
  const listing = await Listing.create({ ...req.body, owner: req.user._id });
  await listing.populate('owner', 'name role location');
  await listing.populate('category', 'name slug');
  res.status(201).json({ success: true, listing: toListingDTO(listing, req.user._id) });
});

const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id })
    .populate('category', 'name slug')
    .sort('-createdAt');
  res.json({ success: true, listings: listings.map((l) => toListingDTO(l, req.user._id)) });
});

const getFavourites = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ favouritedBy: req.user._id })
    .populate('owner', 'name role location')
    .populate('category', 'name slug')
    .sort('-createdAt');
  res.json({ success: true, listings: listings.map((l) => toListingDTO(l, req.user._id)) });
});

const getListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate('owner', 'name role location')
    .populate('category', 'name slug');
  if (!listing) throw new ApiError(404, 'Listing not found');
  res.json({ success: true, listing: toListingDTO(listing, req.user?._id) });
});

const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not own this listing');
  }
  await assertValidCategory(req.body.category);
  Object.assign(listing, req.body);
  await listing.save();
  await listing.populate('owner', 'name role location');
  await listing.populate('category', 'name slug');
  res.json({ success: true, listing: toListingDTO(listing, req.user._id) });
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

const toggleFavourite = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');

  const userId = req.user._id.toString();
  const alreadyFavourited = listing.favouritedBy.some((id) => id.toString() === userId);

  if (alreadyFavourited) {
    listing.favouritedBy = listing.favouritedBy.filter((id) => id.toString() !== userId);
  } else {
    listing.favouritedBy.push(req.user._id);
  }
  await listing.save();

  res.json({ success: true, isFavourited: !alreadyFavourited, favouritesCount: listing.favouritedBy.length });
});

const uploadListingImages = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You do not own this listing');
  }
  if (!req.files || req.files.length === 0) throw new ApiError(400, 'No images were provided');

  const urls = await uploadImages(req.files, `krishibond/listings/${listing._id}`);
  listing.images.push(...urls);
  await listing.save();

  res.status(201).json({ success: true, images: listing.images });
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
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(10);
  res.json({ success: true, matches: listings.map((l) => toListingDTO(l, req.user._id)) });
});

// Aggregate average agreed price per unit from historical contracts as a market benchmark
const getPriceBenchmark = asyncHandler(async (req, res) => {
  const { cropType } = req.query;
  if (!cropType || typeof cropType !== 'string') throw new ApiError(400, 'cropType query param is required');

  const stats = await Contract.aggregate([
    { $match: { cropType: new RegExp(`^${escapeRegex(cropType)}$`, 'i'), agreedPricePerUnit: { $gt: 0 } } },
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
  getMyListings,
  getFavourites,
  getListing,
  updateListing,
  deleteListing,
  toggleFavourite,
  uploadListingImages,
  getMatches,
  getPriceBenchmark,
};
