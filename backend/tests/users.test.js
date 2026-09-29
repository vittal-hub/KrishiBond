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

describe('Village/City on registration and profile', () => {
  it('saves the village entered at registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ramesh Meena',
      email: 'village-register@example.com',
      password: 'password123',
      role: 'farmer',
      phone: '9876543210',
      location: { state: 'Tamil Nadu', district: 'Kanchipuram', village: 'Tambaram' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user.location.village).toBe('Tambaram');

    const stored = await User.findOne({ email: 'village-register@example.com' });
    expect(stored.location.village).toBe('Tambaram');
  });

  it('rejects a whitespace-only village at registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ramesh Meena',
      email: 'village-invalid@example.com',
      password: 'password123',
      role: 'farmer',
      phone: '9876543210',
      location: { state: 'Tamil Nadu', district: 'Kanchipuram', village: '   ' },
    });

    expect(res.status).toBe(400);
  });

  it('registers successfully with no village at all (village stays optional)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ramesh Meena',
      email: 'village-none@example.com',
      password: 'password123',
      role: 'farmer',
      phone: '9876543210',
      location: { state: 'Tamil Nadu', district: 'Kanchipuram' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user.location.village).toBeUndefined();
  });

  it('lets a user add/edit their village from the profile', async () => {
    const { accessToken } = await registerUser(app, { email: 'village-profile@example.com' });

    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(accessToken))
      .send({ location: { state: 'Kerala', district: 'Ernakulam', village: 'Fort Kochi' } });

    expect(res.status).toBe(200);
    expect(res.body.user.location.village).toBe('Fort Kochi');
  });

  it('does not break loading an existing user that has no village set', async () => {
    const { accessToken } = await registerUser(app, { email: 'village-legacy@example.com' });

    const res = await request(app).get('/api/auth/me').set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.user.location?.village).toBeUndefined();
  });
});
