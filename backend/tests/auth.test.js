const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const User = require('../src/models/User');

beforeAll(async () => {
  await testDb.connect();
});

afterEach(async () => {
  await testDb.clearCollections();
});

afterAll(async () => {
  await testDb.disconnect();
});

const VALID_USER = {
  name: 'Ramesh Meena',
  email: 'ramesh@example.com',
  password: 'password123',
  role: 'farmer',
  phone: '9876543210',
};

describe('POST /api/auth/register', () => {
  it('creates a new account and returns an access token', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'admin' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(VALID_USER);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects a suspended account', async () => {
    await User.updateOne({ email: VALID_USER.email }, { status: 'suspended' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(403);
  });
});

describe('protected routes', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts requests with a valid access token', async () => {
    const { body } = await request(app).post('/api/auth/register').send(VALID_USER);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it('rejects a token for a since-suspended account', async () => {
    const { body } = await request(app).post('/api/auth/register').send(VALID_USER);
    await User.updateOne({ email: VALID_USER.email }, { status: 'suspended' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`);

    expect(res.status).toBe(403);
  });
});
