const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Kyc = require('../models/Kyc');
const Dispute = require('../models/Dispute');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');
const { toUserDTO } = require('../utils/dto');
const { recordAudit } = require('../utils/auditLog');
const { notifyUser } = require('../utils/notify');
const { escapeRegex } = require('../utils/regex');
const { toPaymentDTO } = require('../utils/dto');
const walletService = require('../services/wallet.service');

const CONTRACT_STATUSES = ['pending', 'active', 'fulfilled', 'disputed', 'cancelled'];
const USER_ROLES = ['farmer', 'buyer', 'admin'];
const USER_STATUSES = ['active', 'suspended', 'deleted'];

const listUsers = asyncHandler(async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (typeof role === 'string' && USER_ROLES.includes(role)) filter.role = role;
  if (typeof status === 'string' && USER_STATUSES.includes(status)) filter.status = status;
  if (typeof search === 'string' && search.trim()) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    users: users.map(toUserDTO),
    meta: { page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)), total },
  });
});

const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be suspended');
  if (user.status === 'suspended') throw new ApiError(400, 'User is already suspended');

  user.status = 'suspended';
  await user.save();

  await recordAudit(req, {
    action: 'USER_SUSPEND',
    entityType: 'User',
    entityId: user._id,
    before: { status: 'active' },
    after: { status: 'suspended', reason: req.body.reason },
  });

  await notifyUser(req.app.get('io'), user._id, {
    type: 'account_suspended',
    category: 'system',
    message: req.body.reason ? `Your account has been suspended: ${req.body.reason}` : 'Your account has been suspended',
    link: '/profile',
  });

  res.json({ success: true, user: toUserDTO(user) });
});

const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.status !== 'suspended') throw new ApiError(400, 'User is not suspended');

  user.status = 'active';
  await user.save();

  await recordAudit(req, {
    action: 'USER_REACTIVATE',
    entityType: 'User',
    entityId: user._id,
    before: { status: 'suspended' },
    after: { status: 'active' },
  });

  await notifyUser(req.app.get('io'), user._id, {
    type: 'account_reactivated',
    category: 'system',
    message: 'Your account has been reactivated',
    link: '/profile',
  });

  res.json({ success: true, user: toUserDTO(user) });
});

const getStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    usersByRoleAgg,
    newSignups7d,
    pendingKyc,
    openDisputes,
    contractsByStatusAgg,
    escrowHeldAgg,
    gmvTrendAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Kyc.countDocuments({ status: 'pending' }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'held' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([
      { $match: { status: 'released', releasedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$releasedAt' }, month: { $month: '$releasedAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const usersByRole = { farmer: 0, buyer: 0, admin: 0 };
  usersByRoleAgg.forEach((r) => {
    usersByRole[r._id] = r.count;
  });

  const contractsByStatus = CONTRACT_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  contractsByStatusAgg.forEach((c) => {
    contractsByStatus[c._id] = c.count;
  });

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const gmvTrend = gmvTrendAgg.map((g) => ({
    label: MONTH_LABELS[g._id.month - 1],
    value: g.total,
  }));
  const gmv = gmvTrendAgg.reduce((sum, g) => sum + g.total, 0);

  res.json({
    success: true,
    stats: {
      totalUsers,
      usersByRole,
      newSignups7d,
      pendingKyc,
      openDisputes,
      activeContracts: contractsByStatus.active,
      contractsByStatus,
      escrowHeld: escrowHeldAgg[0]?.total || 0,
      gmv,
      gmvTrend,
    },
  });
});

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const listTickets = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = typeof status === 'string' && TICKET_STATUSES.includes(status) ? { status } : {};
  const tickets = await SupportTicket.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, tickets });
});

const updateTicket = asyncHandler(async (req, res) => {
  const { status, response } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Support ticket not found');

  const before = { status: ticket.status, response: ticket.response };

  ticket.status = status;
  if (response) ticket.response = response;
  if (['resolved', 'closed'].includes(status)) {
    ticket.resolvedBy = req.user._id;
    ticket.resolvedAt = new Date();
  }
  await ticket.save();

  await recordAudit(req, {
    action: 'TICKET_STATUS_UPDATE',
    entityType: 'SupportTicket',
    entityId: ticket._id,
    before,
    after: { status: ticket.status, response: ticket.response },
  });

  await notifyUser(req.app.get('io'), ticket.user, {
    type: 'support_ticket_update',
    category: 'system',
    message: response
      ? `Support replied to "${ticket.subject}": ${response}`
      : `Your support ticket "${ticket.subject}" is now ${status.replace('_', ' ')}`,
    link: '/help',
  });

  res.json({ success: true, ticket });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments({}),
  ]);

  res.json({
    success: true,
    logs: logs.map((l) => ({
      id: l._id,
      actorId: l.actor?._id || l.actor,
      actorName: l.actor?.name || 'Unknown',
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      before: l.before,
      after: l.after,
      createdAt: l.createdAt,
    })),
    meta: { page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)), total },
  });
});

const PAYMENT_STATUSES = ['pending', 'held', 'released', 'refunded', 'failed'];

const listPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (typeof status === 'string' && PAYMENT_STATUSES.includes(status)) filter.status = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('contract', 'cropType')
      .populate('payer', 'name')
      .populate('payee', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    payments: payments.map(toPaymentDTO),
    meta: { page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)), total },
  });
});

// Manual admin override of a payment's status - e.g. resolving a stuck demo
// payment, marking a refund actually issued outside the app, or forcing a
// failure. Mirrors the ledger side effects the normal flows already apply.
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const payment = await Payment.findById(req.params.id).populate('contract');
  if (!payment) throw new ApiError(404, 'Payment not found');

  const before = payment.status;

  if (status === 'refunded') {
    if (payment.status !== 'held') throw new ApiError(400, 'Only held payments can be refunded');
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();
    await walletService.recordRefund({
      buyerId: payment.payer,
      amount: payment.amount,
      payment,
      contract: payment.contract,
      gateway: payment.gateway,
      gatewayRef: `admin-refund-${payment._id}`,
    });
  } else if (status === 'held') {
    payment.status = 'held';
    payment.paidAt = payment.paidAt || new Date();
    await payment.save();
  } else if (status === 'failed') {
    payment.status = 'failed';
    payment.failureReason = payment.failureReason || 'Marked failed by admin';
    await payment.save();
  } else {
    throw new ApiError(400, 'Unsupported status transition');
  }

  await recordAudit(req, {
    action: 'PAYMENT_STATUS_OVERRIDE',
    entityType: 'Payment',
    entityId: payment._id,
    before: { status: before },
    after: { status: payment.status },
  });

  res.json({ success: true, payment: toPaymentDTO(payment) });
});

module.exports = {
  listUsers,
  suspendUser,
  reactivateUser,
  getStats,
  listTickets,
  updateTicket,
  listAuditLogs,
  listPayments,
  updatePaymentStatus,
};
