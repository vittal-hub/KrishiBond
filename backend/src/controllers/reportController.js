const asyncHandler = require('../utils/asyncHandler');
const Contract = require('../models/Contract');

const getSummary = asyncHandler(async (req, res) => {
  const filter = { $or: [{ farmer: req.user._id }, { buyer: req.user._id }] };

  const byStatus = await Contract.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byMonth = await Contract.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$agreedPricePerUnit', 0] }] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.json({
    success: true,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    byMonth: byMonth.map((m) => ({
      year: m._id.year,
      month: m._id.month,
      totalValue: m.totalValue,
      count: m.count,
    })),
  });
});

const exportContracts = asyncHandler(async (req, res) => {
  const filter = { $or: [{ farmer: req.user._id }, { buyer: req.user._id }] };
  const contracts = await Contract.find(filter).populate('farmer', 'name').populate('buyer', 'name').lean();

  const header = 'id,cropType,quantity,unit,agreedPricePerUnit,status,farmer,buyer,createdAt\n';
  const rows = contracts
    .map((c) =>
      [
        c._id,
        c.cropType,
        c.quantity,
        c.unit,
        c.agreedPricePerUnit || '',
        c.status,
        c.farmer?.name || '',
        c.buyer?.name || '',
        c.createdAt.toISOString(),
      ].join(',')
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="contracts.csv"');
  res.send(header + rows);
});

module.exports = { getSummary, exportContracts };
