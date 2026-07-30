const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Contract = require('../models/Contract');
const Transaction = require('../models/Transaction');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Admin can request `?scope=platform` for an unscoped, platform-wide report;
// every other caller (and every non-admin) is always scoped to their own
// contracts/transactions regardless of what's in the query string.
function isPlatformScope(req) {
  return req.user.role === 'admin' && req.query.scope === 'platform';
}

function contractScopeFilter(req) {
  return isPlatformScope(req) ? {} : { $or: [{ farmer: req.user._id }, { buyer: req.user._id }] };
}

function transactionScopeFilter(req) {
  return isPlatformScope(req) ? {} : { user: req.user._id };
}

function dateRangeFilter(req, field = 'createdAt') {
  const { from, to } = req.query;
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return { [field]: range };
}

async function incomeByMonth(req) {
  const filter = { ...transactionScopeFilter(req), status: 'success', ...dateRangeFilter(req) };
  const rows = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthMap = new Map();
  rows.forEach((row) => {
    const key = `${row._id.year}-${row._id.month}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: `${MONTH_LABELS[row._id.month - 1]} ${row._id.year}`, earned: 0, spent: 0, refunded: 0 });
    }
    const entry = monthMap.get(key);
    if (row._id.type === 'escrow_release') entry.earned += row.total;
    if (row._id.type === 'escrow_fund') entry.spent += row.total;
    if (row._id.type === 'refund') entry.refunded += row.total;
  });

  return [...monthMap.values()];
}

async function cropsBreakdown(req) {
  const filter = { ...contractScopeFilter(req), ...dateRangeFilter(req) };
  const rows = await Contract.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$cropType',
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$agreedPricePerUnit', 0] }] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);
  return rows.map((c) => ({ cropType: c._id, totalQuantity: c.totalQuantity, totalValue: c.totalValue, count: c.count }));
}

const getSummary = asyncHandler(async (req, res) => {
  const filter = { ...contractScopeFilter(req), ...dateRangeFilter(req) };

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

  const totalContracts = byStatus.reduce((sum, s) => sum + s.count, 0);
  const totalValue = byMonth.reduce((sum, m) => sum + m.totalValue, 0);
  const fulfilled = byStatus.find((s) => s._id === 'fulfilled')?.count || 0;
  const disputeCount = byStatus.find((s) => s._id === 'disputed')?.count || 0;

  res.json({
    success: true,
    totalContracts,
    totalValue,
    onTimeRate: totalContracts > 0 ? Math.round((fulfilled / totalContracts) * 100) : 0,
    disputeCount,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    byMonth: byMonth.map((m) => ({
      month: `${MONTH_LABELS[m._id.month - 1]} ${m._id.year}`,
      value: m.totalValue,
      count: m.count,
    })),
  });
});

const getIncomeSummary = asyncHandler(async (req, res) => {
  const trend = await incomeByMonth(req);
  res.json({
    success: true,
    trend,
    totalEarned: trend.reduce((s, m) => s + m.earned, 0),
    totalSpent: trend.reduce((s, m) => s + m.spent, 0),
    totalRefunded: trend.reduce((s, m) => s + m.refunded, 0),
  });
});

const getCropsSummary = asyncHandler(async (req, res) => {
  const crops = await cropsBreakdown(req);
  res.json({ success: true, crops });
});

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function sendCsv(res, filename, columns, rows) {
  const header = columns.map((c) => c.header).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(`${header}\n${body}`);
}

async function sendXlsx(res, filename, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

const REPORT_BUILDERS = {
  contracts: async (req) => {
    const contracts = await Contract.find({ ...contractScopeFilter(req), ...dateRangeFilter(req) })
      .populate('farmer', 'name')
      .populate('buyer', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return {
      filename: 'krishibond-contracts',
      columns: [
        { header: 'Contract ID', key: 'id' },
        { header: 'Crop', key: 'cropType' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'Price/Unit', key: 'pricePerUnit' },
        { header: 'Status', key: 'status' },
        { header: 'Farmer', key: 'farmer' },
        { header: 'Buyer', key: 'buyer' },
        { header: 'Created', key: 'createdAt' },
      ],
      rows: contracts.map((c) => ({
        id: c._id.toString(),
        cropType: c.cropType,
        quantity: c.quantity,
        unit: c.unit,
        pricePerUnit: c.agreedPricePerUnit || '',
        status: c.status,
        farmer: c.farmer?.name || '',
        buyer: c.buyer?.name || '',
        createdAt: c.createdAt.toISOString(),
      })),
    };
  },

  transactions: async (req) => {
    const transactions = await Transaction.find({ ...transactionScopeFilter(req), ...dateRangeFilter(req) })
      .populate('user', 'name')
      .populate('contract', 'cropType')
      .sort({ createdAt: -1 })
      .lean();
    return {
      filename: 'krishibond-transactions',
      columns: [
        { header: 'Transaction ID', key: 'id' },
        { header: 'Type', key: 'type' },
        { header: 'Amount', key: 'amount' },
        { header: 'Status', key: 'status' },
        { header: 'User', key: 'user' },
        { header: 'Crop', key: 'crop' },
        { header: 'Date', key: 'createdAt' },
      ],
      rows: transactions.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        status: t.status,
        user: t.user?.name || '',
        crop: t.contract?.cropType || '',
        createdAt: t.createdAt.toISOString(),
      })),
    };
  },

  crops: async (req) => {
    const crops = await cropsBreakdown(req);
    return {
      filename: 'krishibond-crops',
      columns: [
        { header: 'Crop', key: 'cropType' },
        { header: 'Contracts', key: 'count' },
        { header: 'Total Quantity', key: 'totalQuantity' },
        { header: 'Total Value', key: 'totalValue' },
      ],
      rows: crops,
    };
  },

  income: async (req) => {
    const trend = await incomeByMonth(req);
    return {
      filename: 'krishibond-income',
      columns: [
        { header: 'Month', key: 'month' },
        { header: 'Earned', key: 'earned' },
        { header: 'Spent', key: 'spent' },
        { header: 'Refunded', key: 'refunded' },
      ],
      rows: trend,
    };
  },
};

const exportReport = asyncHandler(async (req, res) => {
  const { type = 'contracts', format = 'csv' } = req.query;
  const builder = REPORT_BUILDERS[type];
  if (!builder) throw new ApiError(400, 'Unsupported report type');
  if (!['csv', 'xlsx'].includes(format)) throw new ApiError(400, 'Unsupported export format');

  const { filename, columns, rows } = await builder(req);

  if (format === 'xlsx') {
    await sendXlsx(res, filename, columns, rows);
  } else {
    sendCsv(res, filename, columns, rows);
  }
});

module.exports = { getSummary, getIncomeSummary, getCropsSummary, exportReport };
