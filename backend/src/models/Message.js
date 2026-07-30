const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
    body: { type: String, trim: true },
    attachments: { type: [String], default: [] },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ thread: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
