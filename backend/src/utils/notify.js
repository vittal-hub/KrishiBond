const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../services/email.service');
const logger = require('./logger');

// Categories default to "on" for email except chat messages, which would be
// spammy to email per-message - users can still opt back in from settings.
const DEFAULT_EMAIL_PREF = {
  contract: true,
  payment: true,
  offer: true,
  kyc: true,
  dispute: true,
  message: false,
  system: true,
};

// Creates a notification, emits it live over the user's socket room, and -
// if the recipient has that category enabled - emails them too. Email
// delivery is best-effort and never blocks or fails the caller's request.
async function notifyUser(io, userId, { type, category = 'system', message, link, data }) {
  const notification = await Notification.create({ user: userId, type, category, message, link, data });

  if (io) {
    io.to(`user:${userId.toString()}`).emit('notification:new', {
      id: notification._id,
      type: notification.type,
      category: notification.category,
      message: notification.message,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt,
    });
  }

  User.findById(userId)
    .select('email name notificationPreferences')
    .then((user) => {
      if (!user?.email) return;
      const enabled = user.notificationPreferences?.email?.[category] ?? DEFAULT_EMAIL_PREF[category] ?? true;
      if (!enabled) return;
      return emailService.sendNotificationEmail(user, { category, message, link });
    })
    .catch((err) => logger.error(`Notification email failed for user ${userId}: ${err.message}`));

  return notification;
}

module.exports = { notifyUser };
