const { WebSocketServer } = require('ws');
const { URL } = require('url');
const { verifyAccessToken } = require('../utils/token');
const { clientUrl } = require('../config/env');
const Thread = require('../models/Thread');
const logger = require('../utils/logger');

const HEARTBEAT_INTERVAL_MS = 30000;

function idOf(ref) {
  return (ref && ref._id ? ref._id : ref).toString();
}

/**
 * Native `ws` replacement for the previous Socket.io server. Exposes the
 * same `io.to(room).emit(event, data)` surface the rest of the codebase
 * (notify.js, contractController, messageController, paymentController,
 * disputeController, adminController, etc.) already codes against, so
 * swapping the transport here required no changes to any of those call
 * sites - only this file and the frontend socket client changed.
 *
 * Wire protocol (both directions): JSON `{ event, data }` frames, mirroring
 * how `socket.emit(event, data)` / `socket.on(event, cb)` looked from the
 * calling code's point of view under Socket.io.
 */
function initSockets(server) {
  const wss = new WebSocketServer({ noServer: true });

  // room ("user:<id>" or "thread:<id>") -> Set<ws>
  const rooms = new Map();

  function joinRoom(room, ws) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
  }

  function leaveRoom(room, ws) {
    const set = rooms.get(room);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) rooms.delete(room);
  }

  function send(ws, event, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  // Same shape the rest of the app already calls: io.to(room).emit(event, data)
  const io = {
    to(room) {
      return {
        emit(event, data) {
          rooms.get(room)?.forEach((ws) => send(ws, event, data));
        },
      };
    },
  };

  // The HTTP server already handles normal requests via Express; this adds a
  // WebSocket upgrade handler alongside it on the same port, so nothing about
  // the deployment (Render, HTTPS -> wss://) needs to change.
  server.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host}`);
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') return;

    // Socket.io previously rejected cross-origin handshakes via its `cors`
    // option; WebSocket upgrades aren't subject to the browser's CORS
    // preflight the way HTTP requests are, so that check is done manually
    // here to keep the same restriction (only the configured frontend origin
    // may open a connection).
    const origin = req.headers.origin;
    if (origin && origin !== clientUrl) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // A browser's native WebSocket API cannot set custom headers, so the
    // access token travels as a query param instead of an Authorization
    // header - the same trust boundary as the rest of the app (a bearer
    // token), just carried differently for this one connection type, and
    // only ever sent over wss:// (TLS) in production.
    const token = url.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = payload.sub;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    logger.debug(`WebSocket connected: user ${ws.userId}`);
    const userRoom = `user:${ws.userId}`;
    joinRoom(userRoom, ws);
    ws.isAlive = true;
    ws.joinedThreadRooms = new Set();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const { event, data } = msg || {};

      if (event === 'thread:join' && data) {
        // Conversation membership is checked here too (not just on the REST
        // endpoints) so a non-participant can't listen in on a thread's
        // live events just by guessing/knowing its id.
        try {
          const thread = await Thread.findById(data).select('participants');
          const isParticipant = thread?.participants.some((p) => idOf(p) === ws.userId);
          if (isParticipant) {
            const room = `thread:${data}`;
            joinRoom(room, ws);
            ws.joinedThreadRooms.add(room);
          }
        } catch {
          // Invalid/unknown thread id - just don't join anything.
        }
      } else if (event === 'thread:leave' && data) {
        const room = `thread:${data}`;
        leaveRoom(room, ws);
        ws.joinedThreadRooms.delete(room);
      } else if (event === 'thread:typing' && data?.threadId) {
        const room = `thread:${data.threadId}`;
        if (!ws.joinedThreadRooms.has(room)) return;
        rooms.get(room)?.forEach((peer) => {
          if (peer !== ws) send(peer, 'thread:typing', { userId: ws.userId, isTyping: Boolean(data.isTyping) });
        });
      }
    });

    ws.on('close', () => {
      logger.debug(`WebSocket disconnected: user ${ws.userId}`);
      leaveRoom(userRoom, ws);
      ws.joinedThreadRooms.forEach((room) => leaveRoom(room, ws));
    });

    ws.on('error', (err) => {
      logger.debug(`WebSocket error for user ${ws.userId}: ${err.message}`);
    });
  });

  // Drops connections that stopped responding (laptop sleep, network drop
  // without a clean close) so rooms don't accumulate dead sockets forever.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);
  wss.on('close', () => clearInterval(heartbeat));

  return io;
}

module.exports = initSockets;
