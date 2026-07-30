const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Faq = require('../models/Faq');
const SupportTicket = require('../models/SupportTicket');
const { recordAudit } = require('../utils/auditLog');

const listFaqs = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = typeof category === 'string' && category.trim() ? { category } : {};
  const faqs = await Faq.find(filter).sort({ createdAt: 1 });
  res.json({ success: true, faqs });
});

const createTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create({
    user: req.user._id,
    subject: req.body.subject,
    message: req.body.message,
  });
  res.status(201).json({ success: true, ticket });
});

const listMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, tickets });
});

// --- Admin: FAQ CMS ---

const createFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.create(req.body);
  await recordAudit(req, { action: 'FAQ_CREATE', entityType: 'Faq', entityId: faq._id, after: faq.toObject() });
  res.status(201).json({ success: true, faq });
});

const updateFaq = asyncHandler(async (req, res) => {
  const before = await Faq.findById(req.params.id);
  if (!before) throw new ApiError(404, 'FAQ not found');
  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await recordAudit(req, {
    action: 'FAQ_UPDATE',
    entityType: 'Faq',
    entityId: faq._id,
    before: before.toObject(),
    after: faq.toObject(),
  });
  res.json({ success: true, faq });
});

const deleteFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.findByIdAndDelete(req.params.id);
  if (!faq) throw new ApiError(404, 'FAQ not found');
  await recordAudit(req, { action: 'FAQ_DELETE', entityType: 'Faq', entityId: faq._id, before: faq.toObject() });
  res.json({ success: true, message: 'FAQ deleted' });
});

module.exports = { listFaqs, createTicket, listMyTickets, createFaq, updateFaq, deleteFaq };
