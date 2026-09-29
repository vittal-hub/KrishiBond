const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
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

describe('Wallet top-up (Add Money)', () => {
  it('rejects an amount below the minimum', async () => {
    const { accessToken } = await registerUser(app);
    const res = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 5 });
    expect(res.status).toBe(400);
  });

  it('rejects a negative amount', async () => {
    const { accessToken } = await registerUser(app);
    const res = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: -100 });
    expect(res.status).toBe(400);
  });

  it('rejects an amount above the maximum', async () => {
    const { accessToken } = await registerUser(app);
    const res = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 500000 });
    expect(res.status).toBe(400);
  });

  it('does not credit the wallet until the (simulated) payment is confirmed', async () => {
    const { accessToken } = await registerUser(app);

    const initiateRes = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 500 });
    expect(initiateRes.status).toBe(201);
    expect(initiateRes.body.gateway).toBe('demo');

    const walletBefore = await request(app).get('/api/wallet/me').set(authHeader(accessToken));
    expect(walletBefore.body.wallet.balance).toBe(0);

    const completeRes = await request(app)
      .post(`/api/wallet/topup/${initiateRes.body.transactionId}/demo/complete`)
      .set(authHeader(accessToken))
      .send({ outcome: 'success', method: 'upi' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.wallet.balance).toBe(500);

    const walletAfter = await request(app).get('/api/wallet/me').set(authHeader(accessToken));
    expect(walletAfter.body.wallet.balance).toBe(500);
  });

  it('does not credit the wallet when the simulated payment fails', async () => {
    const { accessToken } = await registerUser(app);

    const initiateRes = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 500 });

    const completeRes = await request(app)
      .post(`/api/wallet/topup/${initiateRes.body.transactionId}/demo/complete`)
      .set(authHeader(accessToken))
      .send({ outcome: 'failed', method: 'upi' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.transaction.status).toBe('failed');

    const wallet = await request(app).get('/api/wallet/me').set(authHeader(accessToken));
    expect(wallet.body.wallet.balance).toBe(0);
  });

  it('does not let a user complete another user\'s top-up', async () => {
    const a = await registerUser(app, { email: `topup-a-${Date.now()}@example.com` });
    const b = await registerUser(app, { email: `topup-b-${Date.now()}@example.com` });

    const initiateRes = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(a.accessToken))
      .send({ amount: 500 });

    const res = await request(app)
      .post(`/api/wallet/topup/${initiateRes.body.transactionId}/demo/complete`)
      .set(authHeader(b.accessToken))
      .send({ outcome: 'success' });

    expect(res.status).toBe(404);
  });

  it('does not double-credit a top-up completed twice', async () => {
    const { accessToken } = await registerUser(app);
    const initiateRes = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 500 });

    await request(app)
      .post(`/api/wallet/topup/${initiateRes.body.transactionId}/demo/complete`)
      .set(authHeader(accessToken))
      .send({ outcome: 'success' });

    await request(app)
      .post(`/api/wallet/topup/${initiateRes.body.transactionId}/demo/complete`)
      .set(authHeader(accessToken))
      .send({ outcome: 'success' });

    const wallet = await request(app).get('/api/wallet/me').set(authHeader(accessToken));
    expect(wallet.body.wallet.balance).toBe(500);
  });

  it('works independently of any contract or proposal', async () => {
    const { accessToken } = await registerUser(app);
    const res = await request(app)
      .post('/api/wallet/topup/initiate')
      .set(authHeader(accessToken))
      .send({ amount: 250 });
    expect(res.status).toBe(201);
  });
});
