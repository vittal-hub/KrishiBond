const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const Wallet = require('../src/models/Wallet');
const Kyc = require('../src/models/Kyc');
const { registerUser, authHeader, createListing } = require('./helpers');

beforeAll(async () => {
  await testDb.connect();
});

afterEach(async () => {
  await testDb.clearCollections();
});

afterAll(async () => {
  await testDb.disconnect();
});

async function addVerifiedBankAccount(userId) {
  await Kyc.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        status: 'approved',
        bankDetails: { accountHolderName: 'Ramesh Meena', accountNumber: '123456789012', ifsc: 'SBIN0001234' },
      },
    },
    { upsert: true }
  );
}

async function creditWalletBalance(userId, amount) {
  await Wallet.findOneAndUpdate({ user: userId }, { $inc: { balance: amount } }, { upsert: true, new: true });
}

// Drives a contract all the way to a released (settled) payment for `farmer`,
// so their wallet has real, settlement-derived withdrawable balance - not a
// hardcoded test shortcut - to exercise the withdrawal flow against.
async function settleContractForFarmer(farmer, buyer, amount) {
  const listing = await createListing(farmer.user.id, { pricePerUnit: amount, quantity: 1 });
  const createRes = await request(app)
    .post('/api/contracts')
    .set(authHeader(buyer.accessToken))
    .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 1, unit: 'quintal', agreedPricePerUnit: amount });
  const contractId = createRes.body.contract.id;

  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(farmer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(buyer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/accept`).set(authHeader(farmer.accessToken));

  const fundRes = await request(app)
    .post(`/api/contracts/${contractId}/payments/fund`)
    .set(authHeader(buyer.accessToken))
    .send({ amount });
  const paymentId = fundRes.body.payment._id;

  const releaseRes = await request(app)
    .patch(`/api/contracts/${contractId}/payments/${paymentId}/release`)
    .set(authHeader(buyer.accessToken))
    .send({});

  return { contractId, paymentId, releaseRes };
}

describe('settlement (escrow release -> farmer wallet)', () => {
  it('credits the farmer wallet only after escrow is released, not at proposal/contract creation', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    const buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });

    const listing = await createListing(farmer.user.id);
    await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });

    const walletRes = await request(app).get('/api/wallet/me').set(authHeader(farmer.accessToken));
    expect(walletRes.body.wallet.balance).toBe(0);
  });

  it('rejects releasing escrow twice for the same payment (idempotent settlement)', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    const buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });

    const { contractId, paymentId, releaseRes } = await settleContractForFarmer(farmer, buyer, 30000);
    expect(releaseRes.status).toBe(200);

    const secondRelease = await request(app)
      .patch(`/api/contracts/${contractId}/payments/${paymentId}/release`)
      .set(authHeader(buyer.accessToken))
      .send({});
    expect(secondRelease.status).toBe(400);

    const walletRes = await request(app).get('/api/wallet/me').set(authHeader(farmer.accessToken));
    expect(walletRes.body.wallet.balance).toBe(30000);
  });

  it('does not double-credit when two release requests are fired concurrently', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    const buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });

    const listing = await createListing(farmer.user.id, { pricePerUnit: 20000, quantity: 1 });
    const createRes = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 1, unit: 'quintal', agreedPricePerUnit: 20000 });
    const contractId = createRes.body.contract.id;
    await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(farmer.accessToken));
    await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(buyer.accessToken));
    await request(app).post(`/api/contracts/${contractId}/accept`).set(authHeader(farmer.accessToken));
    const fundRes = await request(app)
      .post(`/api/contracts/${contractId}/payments/fund`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 20000 });
    const paymentId = fundRes.body.payment._id;

    const release = () =>
      request(app)
        .patch(`/api/contracts/${contractId}/payments/${paymentId}/release`)
        .set(authHeader(buyer.accessToken))
        .send({});

    const [a, b] = await Promise.all([release(), release()]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 400]);

    const walletRes = await request(app).get('/api/wallet/me').set(authHeader(farmer.accessToken));
    expect(walletRes.body.wallet.balance).toBe(20000);
  });

  it('refuses to release escrow for a cancelled contract', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    const buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });

    const listing = await createListing(farmer.user.id);
    const createRes = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });
    const contractId = createRes.body.contract.id;

    await request(app).post(`/api/contracts/${contractId}/cancel`).set(authHeader(buyer.accessToken)).send({});

    const res = await request(app)
      .patch(`/api/contracts/${contractId}/payments/someid/release`)
      .set(authHeader(buyer.accessToken))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('withdraw to bank', () => {
  it('rejects a withdrawal with no bank account on file', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await creditWalletBalance(farmer.user.id, 5000);

    const res = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bank account/i);
  });

  it('rejects a withdrawal when the bank account is not yet verified', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await creditWalletBalance(farmer.user.id, 5000);
    await Kyc.create({
      user: farmer.user.id,
      status: 'pending',
      bankDetails: { accountHolderName: 'Ramesh Meena', accountNumber: '123456789012', ifsc: 'SBIN0001234' },
    });

    const res = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/verif/i);
  });

  it('rejects a withdrawal greater than the available balance', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 10000);

    const res = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 15000 });

    expect(res.status).toBe(400);
    const wallet = await Wallet.findOne({ user: farmer.user.id });
    expect(wallet.balance).toBe(10000);
  });

  it('rejects zero, negative, and non-numeric withdrawal amounts', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 10000);

    for (const amount of [0, -500, 'abc']) {
      const res = await request(app)
        .post('/api/wallet/withdraw/initiate')
        .set(authHeader(farmer.accessToken))
        .send({ amount });
      expect(res.status).toBe(400);
    }
  });

  it('reserves the amount immediately (moves it out of available balance) on initiate', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const res = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });
    expect(res.status).toBe(201);

    const wallet = await Wallet.findOne({ user: farmer.user.id });
    expect(wallet.balance).toBe(30000);
    expect(wallet.pendingWithdrawal).toBe(20000);
  });

  it('completes successfully and finalizes the pending amount, leaving the wallet correct', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const initRes = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });

    const completeRes = await request(app)
      .post(`/api/wallet/withdraw/${initRes.body.transactionId}/demo/complete`)
      .set(authHeader(farmer.accessToken))
      .send({ outcome: 'success' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.transaction.status).toBe('success');
    expect(completeRes.body.wallet.balance).toBe(30000);
    expect(completeRes.body.wallet.pendingWithdrawal).toBe(0);
  });

  it('restores the wallet balance when the simulated payout fails', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const initRes = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });

    const completeRes = await request(app)
      .post(`/api/wallet/withdraw/${initRes.body.transactionId}/demo/complete`)
      .set(authHeader(farmer.accessToken))
      .send({ outcome: 'failed' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.transaction.status).toBe('failed');
    expect(completeRes.body.wallet.balance).toBe(50000);
    expect(completeRes.body.wallet.pendingWithdrawal).toBe(0);
  });

  it('does not process the same withdrawal twice, even if completion is retried', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const initRes = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });

    await request(app)
      .post(`/api/wallet/withdraw/${initRes.body.transactionId}/demo/complete`)
      .set(authHeader(farmer.accessToken))
      .send({ outcome: 'success' });

    const retry = await request(app)
      .post(`/api/wallet/withdraw/${initRes.body.transactionId}/demo/complete`)
      .set(authHeader(farmer.accessToken))
      .send({ outcome: 'success' });

    expect(retry.status).toBe(200);
    expect(retry.body.transaction.status).toBe('success');

    const wallet = await Wallet.findOne({ user: farmer.user.id });
    expect(wallet.balance).toBe(30000);
  });

  it('does not let concurrent withdrawal requests over-withdraw the same balance', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const withdraw = () =>
      request(app)
        .post('/api/wallet/withdraw/initiate')
        .set(authHeader(farmer.accessToken))
        .send({ amount: 20000 });

    const results = await Promise.all([withdraw(), withdraw(), withdraw()]);
    const succeeded = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 400);

    // 50000 / 20000 = only 2 of the 3 requests can possibly succeed.
    expect(succeeded.length).toBe(2);
    expect(rejected.length).toBe(1);

    const wallet = await Wallet.findOne({ user: farmer.user.id });
    expect(wallet.balance).toBe(10000);
    expect(wallet.pendingWithdrawal).toBe(40000);
  });

  it('rejects an unauthenticated withdrawal request', async () => {
    const res = await request(app).post('/api/wallet/withdraw/initiate').send({ amount: 1000 });
    expect(res.status).toBe(401);
  });

  it('a user can only see/act on their own wallet and withdrawal - never another user\'s', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    const otherFarmer = await registerUser(app, { role: 'farmer', email: 'other@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    const initRes = await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });

    const hijackAttempt = await request(app)
      .post(`/api/wallet/withdraw/${initRes.body.transactionId}/demo/complete`)
      .set(authHeader(otherFarmer.accessToken))
      .send({ outcome: 'success' });

    expect(hijackAttempt.status).toBe(404);

    const farmerWallet = await Wallet.findOne({ user: farmer.user.id });
    expect(farmerWallet.balance).toBe(30000);
    expect(farmerWallet.pendingWithdrawal).toBe(20000);
  });

  it('the transaction/history endpoint includes the withdrawal', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    await addVerifiedBankAccount(farmer.user.id);
    await creditWalletBalance(farmer.user.id, 50000);

    await request(app)
      .post('/api/wallet/withdraw/initiate')
      .set(authHeader(farmer.accessToken))
      .send({ amount: 20000 });

    const listRes = await request(app)
      .get('/api/transactions?type=withdrawal')
      .set(authHeader(farmer.accessToken));

    expect(listRes.status).toBe(200);
    expect(listRes.body.transactions).toHaveLength(1);
    expect(listRes.body.transactions[0].type).toBe('withdrawal');
    expect(listRes.body.transactions[0].amount).toBe(20000);
    expect(listRes.body.transactions[0].status).toBe('processing');
  });
});
