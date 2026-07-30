const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    lastMessage: {
      body: String,
      type: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Thread', threadSchema);
