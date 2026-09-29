const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    type: {
      type: String,
      enum: ['escrow_fund', 'escrow_release', 'refund', 'platform_fee', 'wallet_topup', 'withdrawal'],
      required: true,
    },
    amount: { type: Number, required: true },
    // 'processing' sits between a withdrawal being reserved (funds already
    // moved out of `balance`) and the simulated payout resolving it to
    // 'success' (COMPLETED) or 'failed' (funds restored) - see
    // walletController.initiateWithdrawal/completeWithdrawalDemo.
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed', 'reversed'], default: 'success' },
    gateway: { type: String, enum: ['stub', 'razorpay', 'demo'], default: 'stub' },
    // Unique per real gateway event so webhook retries can't double-credit a wallet.
    gatewayRef: { type: String, unique: true, sparse: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ contract: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
