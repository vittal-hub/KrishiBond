const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Review = require('../models/Review');
const User = require('../models/User');
const { notifyUser } = require('../utils/notify');
const { toReviewDTO } = require('../utils/dto');
const { assertParty } = require('./contractController');

async function recomputeRating(userId) {
  const stats = await Review.aggregate([
    { $match: { reviewee: userId } },
    { $group: { _id: '$reviewee', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await User.findByIdAndUpdate(userId, { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count });
}

const createReview = asyncHandler(async (req, res) => {
  const { contractId, rating, comment } = req.body;
  const contract = await Contract.findById(contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);
  if (contract.status !== 'fulfilled') {
    throw new ApiError(400, 'You can only review a contract once it is marked fulfilled');
  }

  const reviewee = contract.farmer.toString() === req.user._id.toString() ? contract.buyer : contract.farmer;

  let review;
  try {
    review = await Review.create({ contract: contract._id, reviewer: req.user._id, reviewee, rating, comment });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You already reviewed this contract');
    throw err;
  }
  await review.populate('reviewer', 'name');
  await review.populate('reviewee', 'name');

  await recomputeRating(reviewee);

  await notifyUser(req.app.get('io'), reviewee, {
    type: 'review_received',
    category: 'contract',
    message: `${req.user.name} left you a ${rating}-star review`,
    link: `/users/${reviewee}`,
  });

  res.status(201).json({ success: true, review: toReviewDTO(review) });
});

const listReviewsForUser = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

  const filter = { reviewee: req.params.userId };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Review.countDocuments(filter),
  ]);

  res.json({
    success: true,
    reviews: reviews.map(toReviewDTO),
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// Reviews either party has (or hasn't) left for a given contract - lets the
// UI know whether to show "leave a review" or the review that's already there.
const getContractReviews = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.contractId);
  if (!contract) throw new ApiError(404, 'Contract not found');
  assertParty(contract, req.user._id);

  const reviews = await Review.find({ contract: contract._id }).populate('reviewer', 'name').populate('reviewee', 'name');
  res.json({ success: true, reviews: reviews.map(toReviewDTO) });
});

const respondToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.reviewee.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only the reviewed party can respond');
  }

  review.response = req.body.text;
  await review.save();
  await review.populate('reviewer', 'name');
  await review.populate('reviewee', 'name');

  res.json({ success: true, review: toReviewDTO(review) });
});

module.exports = { createReview, listReviewsForUser, getContractReviews, respondToReview };
