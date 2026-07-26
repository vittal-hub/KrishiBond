const { WebSocketServer } = require('ws');
const { URL } = require('url');
const { verifyAccessToken } = require('../utils/token');
const logger = require('../utils/logger');

// Plain `ws` has no built-in rooms/broadcast helpers like socket.io, so this
// module builds a small room registry and exposes an `io`-shaped object
// ( io.to(room).emit(event, data) ) so the rest of the codebase (notify.js,
// contractController, messageController, etc.) doesn't need to change.

function initSockets(server) {
  const wss = new WebSocketServer({ noServer: true });

  const rooms = new Map(); // roomName -> Set<ws>

  function join(room, ws) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
  }

  function leave(room, ws) {
    rooms.get(room)?.delete(ws);
    if (rooms.get(room)?.size === 0) rooms.delete(room);
  }

  function leaveAll(ws) {
    ws.rooms?.forEach((room) => leave(room, ws));
  }

  function send(ws, event, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  // HTTP -> WebSocket upgrade, with JWT auth via ?token= query param
  server.on('upgrade', (req, socket, head) => {
    let token;
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }
      token = url.searchParams.get('token');
    } catch (err) {
      socket.destroy();
      return;
    }

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
    ws.rooms = new Set([`user:${ws.userId}`]);
    join(`user:${ws.userId}`, ws);

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (err) {
        return; // ignore malformed messages
      }

      if (msg.type === 'thread:join' && msg.threadId) {
        const room = `thread:${msg.threadId}`;
        ws.rooms.add(room);
        join(room, ws);
      }

      if (msg.type === 'thread:leave' && msg.threadId) {
        const room = `thread:${msg.threadId}`;
        ws.rooms.delete(room);
        leave(room, ws);
      }
    });

    ws.on('close', () => {
      logger.debug(`WebSocket disconnected: user ${ws.userId}`);
      leaveAll(ws);
    });
  });

  // io-shaped interface used by controllers/utils: io.to(room).emit(event, data)
  const io = {
    to(room) {
      return {
        emit(event, data) {
          const sockets = rooms.get(room);
          if (!sockets) return;
          sockets.forEach((ws) => send(ws, event, data));
        },
      };
    },
  };

  return io;
}

module.exports = initSockets;
