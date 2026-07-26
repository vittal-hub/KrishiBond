const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'general' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Faq', faqSchema);
