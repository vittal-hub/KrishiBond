const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'voice'], default: 'text' },
    body: { type: String, trim: true },
    attachments: { type: [String], default: [] },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Client-generated id for the send action that produced this message.
    // Lets sendMessage/uploadAttachment be idempotent: if the same compose
    // action is submitted twice (a manual retry after a slow/timed-out
    // request, or a double-fired event), the second attempt returns the
    // already-created message instead of inserting a duplicate.
    clientId: { type: String },
  },
  { timestamps: true }
);

messageSchema.index({ thread: 1, createdAt: -1 });
messageSchema.index({ thread: 1, clientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Message', messageSchema);
