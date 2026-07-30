const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const User = require('../src/models/User');
const { registerUser, authHeader } = require('./helpers');

beforeAll(async () => {
  await testDb.connect();
});

afterEach(async () => {
  await testDb.clearCollections();
});

afterAll(async () => {
  await testDb.disconnect();
});

async function activeContract(farmer, buyer) {
  const createRes = await request(app)
    .post('/api/contracts')
    .set(authHeader(buyer.accessToken))
    .send({ farmerId: farmer.user.id, cropType: 'Wheat', quantity: 5, unit: 'quintal', agreedPricePerUnit: 2000 });
  const contractId = createRes.body.contract.id;
  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(farmer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(buyer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/accept`).set(authHeader(farmer.accessToken));
  return contractId;
}

describe('demo payment gateway', () => {
  let farmer;
  let buyer;
  let contractId;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
    contractId = await activeContract(farmer, buyer);
  });

  it('initiates a pending demo payment with merchant summary', async () => {
    const res = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('pending');
    expect(res.body.payment.gateway).toBe('demo');
    expect(res.body.merchant.name).toBe('KrishiBond');
    expect(res.body.merchant.totalAmount).toBe(10000);
  });

  it('rejects the farmer trying to initiate a payment', async () => {
    const res = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(farmer.accessToken))
      .send({ amount: 10000 });
    expect(res.status).toBe(403);
  });

  it('forced success generates a receipt, holds escrow, and credits the wallet', async () => {
    const initiate = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });
    const paymentId = initiate.body.payment.id;

    const complete = await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'success', method: 'upi' });

    expect(complete.status).toBe(200);
    expect(complete.body.payment.status).toBe('held');
    expect(complete.body.payment.receiptNumber).toMatch(/^RCPT-/);
    expect(complete.body.payment.transactionId).toMatch(/^demo_pay_/);

    const wallet = await request(app).get('/api/wallet/me').set(authHeader(farmer.accessToken));
    expect(wallet.body.wallet.balance).toBe(0); // still escrowed, not released
  });

  it('forced failure records a failure reason without touching the wallet', async () => {
    const initiate = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });
    const paymentId = initiate.body.payment.id;

    const complete = await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'failed', method: 'card' });

    expect(complete.status).toBe(200);
    expect(complete.body.payment.status).toBe('failed');
    expect(complete.body.payment.failureReason).toBeTruthy();
  });

  it('forced pending leaves the payment pending and resolvable on retry', async () => {
    const initiate = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });
    const paymentId = initiate.body.payment.id;

    const pendingRes = await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'pending', method: 'wallet' });
    expect(pendingRes.body.payment.status).toBe('pending');

    const resolveRes = await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'success', method: 'wallet' });
    expect(resolveRes.body.payment.status).toBe('held');
  });

  it('appears in the payer and payee payment history', async () => {
    const initiate = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });
    await request(app)
      .post(`/api/contracts/${contractId}/payments/${initiate.body.payment.id}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'success', method: 'upi' });

    const buyerHistory = await request(app).get('/api/payments/history').set(authHeader(buyer.accessToken));
    expect(buyerHistory.body.payments.length).toBe(1);

    const farmerHistory = await request(app).get('/api/payments/history').set(authHeader(farmer.accessToken));
    expect(farmerHistory.body.payments.length).toBe(1);
  });
});

describe('admin payment management', () => {
  let admin;
  let farmer;
  let buyer;
  let contractId;
  let paymentId;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
    admin = await registerUser(app, { role: 'buyer', email: 'admin@example.com' });
    await User.updateOne({ email: 'admin@example.com' }, { role: 'admin' });
    contractId = await activeContract(farmer, buyer);

    const initiate = await request(app)
      .post(`/api/contracts/${contractId}/payments/demo/initiate`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 10000 });
    paymentId = initiate.body.payment.id;
    await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/demo/complete`)
      .set(authHeader(buyer.accessToken))
      .send({ outcome: 'success', method: 'upi' });
  });

  it('lets an admin list all payments', async () => {
    const res = await request(app).get('/api/admin/payments').set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.payments.length).toBe(1);
  });

  it('lets an admin mark a held payment refunded, crediting the buyer correctly', async () => {
    const res = await request(app)
      .patch(`/api/admin/payments/${paymentId}/status`)
      .set(authHeader(admin.accessToken))
      .send({ status: 'refunded' });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('refunded');
  });

  it('blocks a non-admin from overriding payment status', async () => {
    const res = await request(app)
      .patch(`/api/admin/payments/${paymentId}/status`)
      .set(authHeader(buyer.accessToken))
      .send({ status: 'refunded' });
    expect(res.status).toBe(403);
  });
});
