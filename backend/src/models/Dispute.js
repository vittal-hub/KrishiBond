const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const disputeSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    evidenceUrls: [{ type: String }],
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open' },
    resolutionNote: { type: String },
    // The contract's status immediately before it was forced to 'disputed',
    // so resolving/rejecting the dispute can restore the contract to where
    // it actually was instead of assuming it was always 'active'.
    previousContractStatus: { type: String },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
