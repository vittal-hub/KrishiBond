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

async function createPendingContract(farmer, buyer) {
  const res = await request(app)
    .post('/api/contracts')
    .set(authHeader(buyer.accessToken))
    .send({
      farmerId: farmer.user.id,
      cropType: 'Basmati Rice',
      quantity: 10,
      unit: 'quintal',
      agreedPricePerUnit: 3000,
    });
  return res.body.contract;
}

describe('contract lifecycle', () => {
  let farmer;
  let buyer;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
  });

  it('creates a pending contract between a farmer and buyer', async () => {
    const contract = await createPendingContract(farmer, buyer);
    expect(contract.status).toBe('pending');
    expect(contract.farmerId).toBe(farmer.user.id);
    expect(contract.buyerId).toBe(buyer.user.id);
  });

  it('rejects a stranger from viewing the contract', async () => {
    const contract = await createPendingContract(farmer, buyer);
    const stranger = await registerUser(app, { role: 'buyer', email: 'stranger@example.com' });

    const res = await request(app)
      .get(`/api/contracts/${contract.id}`)
      .set(authHeader(stranger.accessToken));

    expect(res.status).toBe(403);
  });

  it('requires both signatures before the contract can be accepted', async () => {
    const contract = await createPendingContract(farmer, buyer);

    const tooEarly = await request(app)
      .post(`/api/contracts/${contract.id}/accept`)
      .set(authHeader(farmer.accessToken));
    expect(tooEarly.status).toBe(400);

    await request(app).post(`/api/contracts/${contract.id}/sign`).set(authHeader(farmer.accessToken));
    await request(app).post(`/api/contracts/${contract.id}/sign`).set(authHeader(buyer.accessToken));

    const accepted = await request(app)
      .post(`/api/contracts/${contract.id}/accept`)
      .set(authHeader(farmer.accessToken));
    expect(accepted.status).toBe(200);
    expect(accepted.body.contract.status).toBe('active');
  });

  it('only allows marking an active contract as fulfilled', async () => {
    const contract = await createPendingContract(farmer, buyer);

    const early = await request(app)
      .post(`/api/contracts/${contract.id}/complete`)
      .set(authHeader(farmer.accessToken));
    expect(early.status).toBe(400);
  });

  it('moves a fully signed contract through accept -> fulfil', async () => {
    const contract = await createPendingContract(farmer, buyer);
    await request(app).post(`/api/contracts/${contract.id}/sign`).set(authHeader(farmer.accessToken));
    await request(app).post(`/api/contracts/${contract.id}/sign`).set(authHeader(buyer.accessToken));
    await request(app).post(`/api/contracts/${contract.id}/accept`).set(authHeader(farmer.accessToken));

    const res = await request(app)
      .post(`/api/contracts/${contract.id}/complete`)
      .set(authHeader(farmer.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.contract.status).toBe('fulfilled');
  });
});

describe('escrow payments', () => {
  let farmer;
  let buyer;
  let contractId;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
    const contract = await createPendingContract(farmer, buyer);
    contractId = contract.id;
    await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(farmer.accessToken));
    await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(buyer.accessToken));
    await request(app).post(`/api/contracts/${contractId}/accept`).set(authHeader(farmer.accessToken));
  });

  it('lets the buyer fund escrow for an active contract (stub gateway)', async () => {
    const res = await request(app)
      .post(`/api/contracts/${contractId}/payments/fund`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 30000 });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('held');
    expect(res.body.gateway).toBe('stub');
  });

  it('rejects the farmer trying to fund escrow', async () => {
    const res = await request(app)
      .post(`/api/contracts/${contractId}/payments/fund`)
      .set(authHeader(farmer.accessToken))
      .send({ amount: 30000 });

    expect(res.status).toBe(403);
  });

  it('releases held escrow to the farmer and updates their wallet', async () => {
    const fundRes = await request(app)
      .post(`/api/contracts/${contractId}/payments/fund`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 30000 });
    const paymentId = fundRes.body.payment._id;

    const releaseRes = await request(app)
      .patch(`/api/contracts/${contractId}/payments/${paymentId}/release`)
      .set(authHeader(buyer.accessToken))
      .send({});

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.payment.status).toBe('released');

    const walletRes = await request(app).get('/api/wallet/me').set(authHeader(farmer.accessToken));
    expect(walletRes.body.wallet.balance).toBe(30000);
  });

  it('refuses a non-admin trying to refund a payment', async () => {
    const fundRes = await request(app)
      .post(`/api/contracts/${contractId}/payments/fund`)
      .set(authHeader(buyer.accessToken))
      .send({ amount: 30000 });
    const paymentId = fundRes.body.payment._id;

    const res = await request(app)
      .post(`/api/contracts/${contractId}/payments/${paymentId}/refund`)
      .set(authHeader(buyer.accessToken));

    expect(res.status).toBe(403);
  });
});
