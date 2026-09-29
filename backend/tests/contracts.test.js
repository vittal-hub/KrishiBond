const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const User = require('../src/models/User');
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

async function createPendingContract(farmer, buyer) {
  const listing = await createListing(farmer.user.id);
  const res = await request(app)
    .post('/api/contracts')
    .set(authHeader(buyer.accessToken))
    .send({
      listingId: listing._id.toString(),
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

  it('accepts and stores a free-text village name', async () => {
    const listing = await createListing(farmer.user.id);
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({
        listingId: listing._id.toString(),
        cropType: 'Basmati Rice',
        quantity: 10,
        unit: 'quintal',
        agreedPricePerUnit: 3000,
        village: 'Kondapur',
      });
    expect(res.status).toBe(201);
    expect(res.body.contract.village).toBe('Kondapur');
  });

  it('rejects a whitespace-only village name', async () => {
    const listing = await createListing(farmer.user.id);
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({
        listingId: listing._id.toString(),
        cropType: 'Basmati Rice',
        quantity: 10,
        unit: 'quintal',
        agreedPricePerUnit: 3000,
        village: '   ',
      });
    expect(res.status).toBe(400);
  });

  it('still creates a contract with no village at all (backward compatible)', async () => {
    const contract = await createPendingContract(farmer, buyer);
    expect(contract.village).toBeUndefined();
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

  it("snapshots the signer's own saved signature, ignoring any signatureUrl sent in the request", async () => {
    const contract = await createPendingContract(farmer, buyer);
    await User.updateOne({ _id: farmer.user.id }, { signatureUrl: 'https://cdn.example.com/real-farmer-signature.png' });

    const res = await request(app)
      .post(`/api/contracts/${contract.id}/sign`)
      .set(authHeader(farmer.accessToken))
      // Attempting to smuggle a different signature via the request body -
      // the backend must never trust this.
      .send({ signatureUrl: 'https://evil.example.com/someone-elses-signature.png' });

    expect(res.status).toBe(200);
    expect(res.body.contract.signatures.farmer.signatureUrl).toBe('https://cdn.example.com/real-farmer-signature.png');
  });

  it('has no signatureUrl on a signature when the signer never uploaded one', async () => {
    const contract = await createPendingContract(farmer, buyer);
    const res = await request(app).post(`/api/contracts/${contract.id}/sign`).set(authHeader(buyer.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.contract.signatures.buyer.signatureUrl).toBeUndefined();
    expect(res.body.contract.signatures.buyer.signatureName).toBe(buyer.user.name);
  });
});

describe('POST /api/users/me/signature', () => {
  it('rejects a request with no file', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'sig-farmer@example.com' });
    const res = await request(app).post('/api/users/me/signature').set(authHeader(farmer.accessToken));
    expect(res.status).toBe(400);
  });

  it('rejects an unsupported file type before ever touching the upload provider', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'sig-farmer2@example.com' });
    const res = await request(app)
      .post('/api/users/me/signature')
      .set(authHeader(farmer.accessToken))
      .attach('signature', Buffer.from('not an image'), { filename: 'signature.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects a file whose bytes do not match its declared image type', async () => {
    const farmer = await registerUser(app, { role: 'farmer', email: 'sig-farmer3@example.com' });
    const res = await request(app)
      .post('/api/users/me/signature')
      .set(authHeader(farmer.accessToken))
      .attach('signature', Buffer.from('not actually a png'), { filename: 'signature.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
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

// Buyers must always propose against a real, open listing - the farmer is
// derived from listing.owner server-side, never trusted from the request
// body. See contractController.createContract.
describe('buyer proposal workflow', () => {
  let farmer;
  let buyer;

  beforeEach(async () => {
    farmer = await registerUser(app, { role: 'farmer', email: 'farmer@example.com' });
    buyer = await registerUser(app, { role: 'buyer', email: 'buyer@example.com' });
  });

  it('rejects a buyer proposal with no listingId', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/listing/i);
  });

  it('ignores a buyer-submitted farmerId and derives the farmer from the listing instead', async () => {
    const listing = await createListing(farmer.user.id);
    const impostor = await registerUser(app, { role: 'farmer', email: 'impostor@example.com' });

    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({
        listingId: listing._id.toString(),
        farmerId: impostor.user.id,
        cropType: 'Wheat',
        quantity: 10,
        unit: 'quintal',
        agreedPricePerUnit: 2000,
      });

    expect(res.status).toBe(201);
    expect(res.body.contract.farmerId).toBe(farmer.user.id);
    expect(res.body.contract.farmerId).not.toBe(impostor.user.id);
  });

  it('rejects a proposal against a non-existent listing', async () => {
    const fakeId = new (require('mongoose').Types.ObjectId)();
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: fakeId.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });

    expect(res.status).toBe(404);
  });

  it('rejects a proposal against a listing that is no longer open', async () => {
    const listing = await createListing(farmer.user.id, { status: 'matched' });
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });

    expect(res.status).toBe(400);
  });

  it('rejects a requested quantity greater than the listing quantity', async () => {
    const listing = await createListing(farmer.user.id, { quantity: 50 });
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 100, unit: 'quintal', agreedPricePerUnit: 2000 });

    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative requested quantity', async () => {
    const listing = await createListing(farmer.user.id);
    const zero = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 0, unit: 'quintal', agreedPricePerUnit: 2000 });
    expect(zero.status).toBe(400);

    const negative = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: -5, unit: 'quintal', agreedPricePerUnit: 2000 });
    expect(negative.status).toBe(400);
  });

  it('rejects a zero, negative, or missing price', async () => {
    const listing = await createListing(farmer.user.id);
    const zero = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 0 });
    expect(zero.status).toBe(400);

    const negative = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: -100 });
    expect(negative.status).toBe(400);
  });

  it('rejects an unauthenticated proposal request', async () => {
    const listing = await createListing(farmer.user.id);
    const res = await request(app)
      .post('/api/contracts')
      .send({ listingId: listing._id.toString(), cropType: 'Wheat', quantity: 10, unit: 'quintal', agreedPricePerUnit: 2000 });

    expect(res.status).toBe(401);
  });

  it('always attributes the proposal to the authenticated buyer, ignoring any buyerId in the body', async () => {
    const listing = await createListing(farmer.user.id);
    const otherBuyer = await registerUser(app, { role: 'buyer', email: 'otherbuyer@example.com' });

    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({
        listingId: listing._id.toString(),
        buyerId: otherBuyer.user.id,
        cropType: 'Wheat',
        quantity: 10,
        unit: 'quintal',
        agreedPricePerUnit: 2000,
      });

    expect(res.status).toBe(201);
    expect(res.body.contract.buyerId).toBe(buyer.user.id);
    expect(res.body.contract.buyerId).not.toBe(otherBuyer.user.id);
  });

  it('lets the farmer see the buyer-created proposal with correct details', async () => {
    const listing = await createListing(farmer.user.id, { cropType: 'Sugarcane', quantity: 80, pricePerUnit: 1500 });

    const createRes = await request(app)
      .post('/api/contracts')
      .set(authHeader(buyer.accessToken))
      .send({ listingId: listing._id.toString(), cropType: 'Sugarcane', quantity: 40, unit: 'quintal', agreedPricePerUnit: 1600 });
    expect(createRes.status).toBe(201);

    const farmerView = await request(app)
      .get(`/api/contracts/${createRes.body.contract.id}`)
      .set(authHeader(farmer.accessToken));

    expect(farmerView.status).toBe(200);
    expect(farmerView.body.contract.buyerId).toBe(buyer.user.id);
    expect(farmerView.body.contract.farmerId).toBe(farmer.user.id);
    expect(farmerView.body.contract.quantity).toBe(40);
    expect(farmerView.body.contract.pricePerUnit).toBe(1600);
    expect(farmerView.body.contract.status).toBe('pending');
  });

  it('still allows the existing farmer-initiated flow (farmer specifies a buyerId directly)', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set(authHeader(farmer.accessToken))
      .send({ buyerId: buyer.user.id, cropType: 'Maize', quantity: 20, unit: 'quintal', agreedPricePerUnit: 1800 });

    expect(res.status).toBe(201);
    expect(res.body.contract.farmerId).toBe(farmer.user.id);
    expect(res.body.contract.buyerId).toBe(buyer.user.id);
  });
});
