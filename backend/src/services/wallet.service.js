const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

async function getOrCreateWallet(userId, session) {
  let wallet = await Wallet.findOne({ user: userId }).session(session || null);
  if (!wallet) {
    // `create` with a session still needs an array form to accept options in
    // older Mongoose versions; passing [doc], {session} works across all.
    const [created] = await Wallet.create([{ user: userId }], { session });
    wallet = created || (await Wallet.findOne({ user: userId }).session(session || null));
  }
  return wallet;
}

/**
 * Buyer funds escrow: money leaves the buyer's external payment method and is
 * locked in escrow for this contract. Tracked as `inEscrow` on the buyer's
 * wallet and as lifetime spend, not their withdrawable `balance`.
 */
async function recordEscrowFund({ buyerId, amount, payment, contract, gateway, gatewayRef, session }) {
  const wallet = await getOrCreateWallet(buyerId, session);
  wallet.inEscrow += amount;
  wallet.lifetimeSpent += amount;
  await wallet.save({ session });

  const [transaction] = await Transaction.create(
    [{ wallet: wallet._id, user: buyerId, payment: payment._id, contract: contract._id, type: 'escrow_fund', amount, gateway, gatewayRef }],
    { session }
  );
  return transaction;
}

/**
 * Escrow released to the farmer: this is the "settlement" step - the ONLY
 * place a contract's fulfillment/payment completion turns into withdrawable
 * farmer wallet balance (never contract/proposal creation on its own). Uses
 * atomic `$inc` updates (not read-modify-write) so concurrent calls can't
 * lose an update, and is meant to run inside the caller's transaction
 * session alongside the Payment status transition that guards against
 * double-settlement (see paymentController.releaseEscrow).
 */
async function recordEscrowRelease({ farmerId, buyerId, amount, payment, contract, gateway, gatewayRef, session }) {
  await getOrCreateWallet(farmerId, session);
  const farmerWallet = await Wallet.findOneAndUpdate(
    { user: farmerId },
    { $inc: { balance: amount, lifetimeEarned: amount } },
    { new: true, session }
  );

  await getOrCreateWallet(buyerId, session);
  await Wallet.findOneAndUpdate(
    { user: buyerId },
    // Never let a rounding/race edge case push this below zero.
    [{ $set: { inEscrow: { $max: [0, { $subtract: ['$inEscrow', amount] }] } } }],
    { session }
  );

  const [transaction] = await Transaction.create(
    [{ wallet: farmerWallet._id, user: farmerId, payment: payment._id, contract: contract._id, type: 'escrow_release', amount, gateway, gatewayRef }],
    { session }
  );
  return transaction;
}

async function recordRefund({ buyerId, amount, payment, contract, gateway, gatewayRef, session }) {
  const wallet = await getOrCreateWallet(buyerId, session);
  wallet.inEscrow = Math.max(0, wallet.inEscrow - amount);
  wallet.lifetimeSpent = Math.max(0, wallet.lifetimeSpent - amount);
  await wallet.save({ session });

  const [transaction] = await Transaction.create(
    [{ wallet: wallet._id, user: buyerId, payment: payment._id, contract: contract._id, type: 'refund', amount, gateway, gatewayRef }],
    { session }
  );
  return transaction;
}

/**
 * Atomically reserves `amount` for a withdrawal: moves it out of `balance`
 * (so it can never be spent twice, including by a second concurrent
 * withdrawal request) into `pendingWithdrawal`. The `balance: {$gte: amount}`
 * guard in the filter is what makes this safe under concurrency - if two
 * requests race for the same funds, at most one `findOneAndUpdate` matches;
 * the other gets `null` back and the caller rejects it as insufficient
 * balance, without ever reading a stale balance first.
 */
async function reserveWithdrawal({ userId, amount, session }) {
  return Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount, pendingWithdrawal: amount } },
    { new: true, session }
  );
}

// Payout confirmed by the (simulated) provider: the reserved amount has now
// genuinely left the wallet for good - only `pendingWithdrawal` shrinks,
// `balance` was already decremented at reservation time and stays that way.
async function finalizeWithdrawalSuccess({ userId, amount, session }) {
  return Wallet.findOneAndUpdate(
    { user: userId },
    [{ $set: { pendingWithdrawal: { $max: [0, { $subtract: ['$pendingWithdrawal', amount] }] } } }],
    { new: true, session }
  );
}

// Payout failed: restore the reserved amount to spendable `balance` - never
// silently lost.
async function finalizeWithdrawalFailure({ userId, amount, session }) {
  return Wallet.findOneAndUpdate(
    { user: userId },
    [
      {
        $set: {
          balance: { $add: ['$balance', amount] },
          pendingWithdrawal: { $max: [0, { $subtract: ['$pendingWithdrawal', amount] }] },
        },
      },
    ],
    { new: true, session }
  );
}

module.exports = {
  getOrCreateWallet,
  recordEscrowFund,
  recordEscrowRelease,
  recordRefund,
  reserveWithdrawal,
  finalizeWithdrawalSuccess,
  finalizeWithdrawalFailure,
};
