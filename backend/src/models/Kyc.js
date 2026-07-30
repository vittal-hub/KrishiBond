const mongoose = require('mongoose');

// Module 1 scope: structured KYC fields only. Document upload (Aadhaar/PAN
// scans via Cloudinary) is added in the dedicated KYC/media module per the
// roadmap - this collection already has the shape ready for it (`*Url` fields).
const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifsc: { type: String, trim: true, uppercase: true },
    },
    aadhaarDocUrl: { type: String },
    panDocUrl: { type: String },
    bankProofUrl: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Kyc', kycSchema);
