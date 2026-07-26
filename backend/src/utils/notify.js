const Notification = require('../models/Notification');

// Creates a notification and, if socket.io is attached to the app, emits it live.
async function notifyUser(io, userId, { type, message, link }) {
  const notification = await Notification.create({ user: userId, type, message, link });
  if (io) {
    io.to(`user:${userId.toString()}`).emit('notification:new', {
      id: notification._id,
      type: notification.type,
      message: notification.message,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt,
    });
  }
  return notification;
}

module.exports = { notifyUser };
