const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Thread', threadSchema);
