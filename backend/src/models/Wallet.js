const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // The only withdrawable figure - increased solely by a settled
    // (released) escrow payment or a verified wallet top-up, never merely by
    // a proposal/contract being created. See walletService.js.
    balance: { type: Number, default: 0 },
    inEscrow: { type: Number, default: 0 },
    // Reserved for an in-flight withdrawal (already removed from `balance`
    // so it can't be spent twice, but not yet confirmed sent by the
    // simulated payout step) - the "Pending" figure shown in the wallet UI.
    pendingWithdrawal: { type: Number, default: 0 },
    lifetimeEarned: { type: Number, default: 0 },
    lifetimeSpent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
