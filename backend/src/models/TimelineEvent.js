const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, required: true },
    detail: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimelineEvent', timelineEventSchema);
