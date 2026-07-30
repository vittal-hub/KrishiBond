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

async function fulfilledContract(farmer, buyer) {
  const createRes = await request(app)
    .post('/api/contracts')
    .set(authHeader(buyer.accessToken))
    .send({ farmerId: farmer.user.id, cropType: 'Wheat', quantity: 5, unit: 'quintal', agreedPricePerUnit: 2000 });
  const contractId = createRes.body.contract.id;

  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(farmer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/sign`).set(authHeader(buyer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/accept`).set(authHeader(farmer.accessToken));
  await request(app).post(`/api/contracts/${contractId}/complete`).set(authHeader(farmer.accessToken));

  return contractId;
}

describe('reviews', () => {
  let farmer;
  let buyer;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
  });

  it('lets a party review the other after fulfilment, and updates the rating average', async () => {
    const contractId = await fulfilledContract(farmer, buyer);

    const res = await request(app)
      .post('/api/reviews')
      .set(authHeader(buyer.accessToken))
      .send({ contractId, rating: 5, comment: 'Great quality wheat, delivered on time.' });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);

    const farmerProfile = await request(app).get(`/api/users/${farmer.user.id}`).set(authHeader(buyer.accessToken));
    expect(farmerProfile.body.user.ratingAvg).toBe(5);
    expect(farmerProfile.body.user.ratingCount).toBe(1);
  });

  it('rejects a duplicate review for the same contract', async () => {
    const contractId = await fulfilledContract(farmer, buyer);
    await request(app).post('/api/reviews').set(authHeader(buyer.accessToken)).send({ contractId, rating: 4 });

    const dupe = await request(app).post('/api/reviews').set(authHeader(buyer.accessToken)).send({ contractId, rating: 2 });
    expect(dupe.status).toBe(409);
  });

  it('rejects a review for a contract that is not yet fulfilled', async () => {
    const createRes = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ farmerId: farmer.user.id, cropType: 'Wheat', quantity: 5, unit: 'quintal', agreedPricePerUnit: 2000 });

    const res = await request(app)
      .post('/api/reviews')
      .set(authHeader(buyer.accessToken))
      .send({ contractId: createRes.body.contract.id, rating: 5 });

    expect(res.status).toBe(400);
  });
});

describe('admin user management', () => {
  let admin;
  let farmer;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    admin = await registerUser(app, { role: 'buyer', email: 'admin@example.com' });
    await User.updateOne({ email: 'admin@example.com' }, { role: 'admin' });
    // Re-login to get a token whose /me reflects the admin role for readability
    // (the existing access token's role claim is unaffected by this update since
    // routes re-check req.user from the DB on every request).
  });

  it('blocks a non-admin from listing all users', async () => {
    const res = await request(app).get('/api/admin/users').set(authHeader(farmer.accessToken));
    expect(res.status).toBe(403);
  });

  it('lets an admin suspend and reactivate a user', async () => {
    const suspendRes = await request(app)
      .patch(`/api/admin/users/${farmer.user.id}/suspend`)
      .set(authHeader(admin.accessToken))
      .send({ reason: 'Suspicious activity' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.user.status).toBe('suspended');

    const blockedLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farmer@example.com', password: 'password123' });
    expect(blockedLogin.status).toBe(403);

    const reactivateRes = await request(app)
      .patch(`/api/admin/users/${farmer.user.id}/reactivate`)
      .set(authHeader(admin.accessToken));
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.user.status).toBe('active');
  });

  it('records an audit log entry for a suspend action', async () => {
    await request(app)
      .patch(`/api/admin/users/${farmer.user.id}/suspend`)
      .set(authHeader(admin.accessToken))
      .send({});

    const logs = await request(app).get('/api/admin/audit-logs').set(authHeader(admin.accessToken));
    expect(logs.status).toBe(200);
    expect(logs.body.logs.some((l) => l.action === 'USER_SUSPEND')).toBe(true);
  });
});
