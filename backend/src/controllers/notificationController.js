const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');
const User = require('../models/User');

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, notifications, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ success: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences');
  res.json({ success: true, preferences: user.notificationPreferences });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const updates = {};
  Object.entries(req.body.email || {}).forEach(([category, enabled]) => {
    updates[`notificationPreferences.email.${category}`] = Boolean(enabled);
  });

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select(
    'notificationPreferences'
  );
  res.json({ success: true, preferences: user.notificationPreferences });
});

module.exports = { listNotifications, markRead, markAllRead, getPreferences, updatePreferences };
