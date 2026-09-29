const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Transaction = require('../models/Transaction');

const TRANSACTION_TYPES = ['escrow_fund', 'escrow_release', 'refund', 'platform_fee', 'wallet_topup', 'withdrawal'];
const TRANSACTION_STATUSES = ['pending', 'processing', 'success', 'failed', 'reversed'];

const listMyTransactions = asyncHandler(async (req, res) => {
  const { type, status, contractId, page = 1, limit = 20 } = req.query;
  const filter = { user: req.user._id };
  if (typeof type === 'string' && TRANSACTION_TYPES.includes(type)) filter.type = type;
  if (typeof status === 'string' && TRANSACTION_STATUSES.includes(status)) filter.status = status;
  if (typeof contractId === 'string' && mongoose.isValidObjectId(contractId)) filter.contract = contractId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('contract', 'cropType quantity unit')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    transactions,
    meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  });
});

// Monthly earned (escrow_release) vs spent (escrow_fund) totals for the last
// N months, for the farmer/buyer dashboard income & spend trend charts.
const getAnalytics = asyncHandler(async (req, res) => {
  const months = Math.min(parseInt(req.query.months, 10) || 6, 12);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await Transaction.aggregate([
    { $match: { user: req.user._id, status: 'success', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    success: true,
    series: rows.map((r) => ({ year: r._id.year, month: r._id.month, type: r._id.type, total: r.total })),
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
    .populate('contract', 'cropType quantity unit farmer buyer')
    .populate('user', 'name email');
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  res.json({ success: true, transaction });
});

module.exports = { listMyTransactions, getAnalytics, getTransaction };
