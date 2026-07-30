const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token');
const { clientUrl } = require('../config/env');
const logger = require('../utils/logger');

// Real Socket.io server. Exposes the same `io.to(room).emit(event, data)`
// surface the rest of the codebase (notify.js, contractController,
// messageController, paymentController, etc.) already codes against, so
// swapping the transport here required no changes anywhere else.
function initSockets(server) {
  const io = new Server(server, {
    cors: { origin: clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Not authenticated'));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: user ${socket.userId}`);
    socket.join(`user:${socket.userId}`);

    socket.on('thread:join', (threadId) => {
      if (threadId) socket.join(`thread:${threadId}`);
    });

    socket.on('thread:leave', (threadId) => {
      if (threadId) socket.leave(`thread:${threadId}`);
    });

    socket.on('thread:typing', ({ threadId, isTyping } = {}) => {
      if (!threadId) return;
      socket.to(`thread:${threadId}`).emit('thread:typing', { userId: socket.userId, isTyping: Boolean(isTyping) });
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user ${socket.userId}`);
    });
  });

  return io;
}

module.exports = initSockets;
