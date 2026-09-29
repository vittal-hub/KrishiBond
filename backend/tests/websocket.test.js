const http = require('http');
const WebSocket = require('ws');
const request = require('supertest');
const testDb = require('./testDb');
const app = require('../src/app');
const initSockets = require('../src/sockets');
const { registerUser, authHeader } = require('./helpers');

let server;
let port;
let io;

beforeAll(async () => {
  await testDb.connect();
  server = http.createServer(app);
  io = initSockets(server);
  app.set('io', io);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await testDb.disconnect();
});

function connectWs(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${encodeURIComponent(token)}`);
    ws.once('open', () => resolve(ws));
    ws.once('unexpected-response', (req, res) => reject(new Error(`Rejected with ${res.statusCode}`)));
    ws.once('error', reject);
  });
}

function waitForMessage(ws, matchEvent) {
  return new Promise((resolve) => {
    ws.on('message', (raw) => {
      const parsed = JSON.parse(raw.toString());
      if (!matchEvent || parsed.event === matchEvent) resolve(parsed);
    });
  });
}

describe('Native WebSocket server', () => {
  it('rejects a connection with no token', async () => {
    await expect(connectWs('')).rejects.toThrow(/401|Rejected/);
  });

  it('rejects a connection with an invalid token', async () => {
    await expect(connectWs('not-a-real-token')).rejects.toThrow(/401|Rejected/);
  });

  it('accepts a connection with a valid access token', async () => {
    const { accessToken } = await registerUser(app);
    const ws = await connectWs(accessToken);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('delivers a notification pushed via io.to(user:<id>).emit(...)', async () => {
    const { user, accessToken } = await registerUser(app);
    const ws = await connectWs(accessToken);

    const received = waitForMessage(ws, 'notification:new');
    io.to(`user:${user.id}`).emit('notification:new', { message: 'hello' });

    const msg = await received;
    expect(msg.data.message).toBe('hello');
    ws.close();
  });

  it('lets a real participant join a thread room and receive a message, but blocks a non-participant', async () => {
    const a = await registerUser(app, { role: 'farmer', email: `a-${Date.now()}@example.com` });
    const b = await registerUser(app, { role: 'buyer', email: `b-${Date.now()}@example.com` });
    const c = await registerUser(app, { role: 'buyer', email: `c-${Date.now()}@example.com` });

    const threadRes = await request(app)
      .post('/api/messages/threads')
      .set(authHeader(a.accessToken))
      .send({ recipientId: b.user.id });
    const threadId = threadRes.body.thread.id;

    const wsA = await connectWs(a.accessToken);
    const wsC = await connectWs(c.accessToken);

    wsA.send(JSON.stringify({ event: 'thread:join', data: threadId }));
    wsC.send(JSON.stringify({ event: 'thread:join', data: threadId })); // c is not a participant
    await new Promise((r) => setTimeout(r, 150)); // let both joins process

    const gotMessage = waitForMessage(wsA, 'message:new');
    let cReceived = false;
    wsC.on('message', () => {
      cReceived = true;
    });

    await request(app)
      .post(`/api/messages/threads/${threadId}`)
      .set(authHeader(b.accessToken))
      .send({ body: 'hi there' });

    const msg = await gotMessage;
    expect(msg.data.body).toBe('hi there');

    await new Promise((r) => setTimeout(r, 150));
    expect(cReceived).toBe(false); // non-participant never got the broadcast

    wsA.close();
    wsC.close();
  });

  it('does not deliver a duplicate on a retried send with the same clientId', async () => {
    const a = await registerUser(app, { email: `dup-a-${Date.now()}@example.com` });
    const b = await registerUser(app, { email: `dup-b-${Date.now()}@example.com` });
    const threadRes = await request(app)
      .post('/api/messages/threads')
      .set(authHeader(a.accessToken))
      .send({ recipientId: b.user.id });
    const threadId = threadRes.body.thread.id;

    const clientId = 'retry-test-1';
    const first = await request(app)
      .post(`/api/messages/threads/${threadId}`)
      .set(authHeader(a.accessToken))
      .send({ body: 'only once', clientId });
    const second = await request(app)
      .post(`/api/messages/threads/${threadId}`)
      .set(authHeader(a.accessToken))
      .send({ body: 'only once', clientId });

    expect(first.body.message.id).toBe(second.body.message.id);

    const list = await request(app)
      .get(`/api/messages/threads/${threadId}`)
      .set(authHeader(a.accessToken));
    const matching = list.body.messages.filter((m) => m.body === 'only once');
    expect(matching).toHaveLength(1);
  });
});
