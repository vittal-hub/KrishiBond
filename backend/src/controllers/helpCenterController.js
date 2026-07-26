const asyncHandler = require('../utils/asyncHandler');
const Faq = require('../models/Faq');
const SupportTicket = require('../models/SupportTicket');

const listFaqs = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
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

module.exports = { listFaqs, createTicket, listMyTickets };
