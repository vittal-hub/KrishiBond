const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

/**
 * Buyer funds escrow: money leaves the buyer's external payment method and is
 * locked in escrow for this contract. Tracked as `inEscrow` on the buyer's
 * wallet and as lifetime spend, not their withdrawable `balance`.
 */
async function recordEscrowFund({ buyerId, amount, payment, contract, gateway, gatewayRef }) {
  const wallet = await getOrCreateWallet(buyerId);
  wallet.inEscrow += amount;
  wallet.lifetimeSpent += amount;
  await wallet.save();

  return Transaction.create({
    wallet: wallet._id,
    user: buyerId,
    payment: payment._id,
    contract: contract._id,
    type: 'escrow_fund',
    amount,
    gateway,
    gatewayRef,
  });
}

/**
 * Escrow released to the farmer: credited to their withdrawable `balance`
 * and lifetime earnings; the buyer's `inEscrow` bucket shrinks accordingly.
 */
async function recordEscrowRelease({ farmerId, buyerId, amount, payment, contract, gateway, gatewayRef }) {
  const farmerWallet = await getOrCreateWallet(farmerId);
  farmerWallet.balance += amount;
  farmerWallet.lifetimeEarned += amount;
  await farmerWallet.save();

  const buyerWallet = await getOrCreateWallet(buyerId);
  buyerWallet.inEscrow = Math.max(0, buyerWallet.inEscrow - amount);
  await buyerWallet.save();

  return Transaction.create({
    wallet: farmerWallet._id,
    user: farmerId,
    payment: payment._id,
    contract: contract._id,
    type: 'escrow_release',
    amount,
    gateway,
    gatewayRef,
  });
}

async function recordRefund({ buyerId, amount, payment, contract, gateway, gatewayRef }) {
  const wallet = await getOrCreateWallet(buyerId);
  wallet.inEscrow = Math.max(0, wallet.inEscrow - amount);
  wallet.lifetimeSpent = Math.max(0, wallet.lifetimeSpent - amount);
  await wallet.save();

  return Transaction.create({
    wallet: wallet._id,
    user: buyerId,
    payment: payment._id,
    contract: contract._id,
    type: 'refund',
    amount,
    gateway,
    gatewayRef,
  });
}

module.exports = { getOrCreateWallet, recordEscrowFund, recordEscrowRelease, recordRefund };
