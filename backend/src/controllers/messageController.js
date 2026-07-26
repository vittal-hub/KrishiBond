const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const { notifyUser } = require('../utils/notify');

const listThreads = asyncHandler(async (req, res) => {
  const threads = await Thread.find({ participants: req.user._id })
    .populate('participants', 'name role')
    .sort({ lastMessageAt: -1 });
  res.json({ success: true, threads });
});

const createThread = asyncHandler(async (req, res) => {
  const { recipientId, contractId } = req.body;
  let thread = await Thread.findOne({
    participants: { $all: [req.user._id, recipientId], $size: 2 },
    contract: contractId || null,
  });

  if (!thread) {
    thread = await Thread.create({ participants: [req.user._id, recipientId], contract: contractId });
  }
  await thread.populate('participants', 'name role');
  res.status(201).json({ success: true, thread });
});

const getMessages = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) throw new ApiError(404, 'Thread not found');
  if (!thread.participants.some((p) => p.toString() === req.user._id.toString())) {
    throw new ApiError(403, 'Not a participant of this thread');
  }

  const messages = await Message.find({ thread: thread._id }).sort({ createdAt: 1 });
  res.json({ success: true, messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) throw new ApiError(404, 'Thread not found');
  if (!thread.participants.some((p) => p.toString() === req.user._id.toString())) {
    throw new ApiError(403, 'Not a participant of this thread');
  }

  const message = await Message.create({
    thread: thread._id,
    sender: req.user._id,
    body: req.body.body,
    readBy: [req.user._id],
  });

  thread.lastMessageAt = new Date();
  await thread.save();

  const io = req.app.get('io');
  if (io) io.to(`thread:${thread._id}`).emit('message:new', message);

  const recipients = thread.participants.filter((p) => p.toString() !== req.user._id.toString());
  await Promise.all(
    recipients.map((r) =>
      notifyUser(io, r, {
        type: 'message',
        message: `New message from ${req.user.name}`,
        link: `/messages/${thread._id}`,
      })
    )
  );

  res.status(201).json({ success: true, message });
});

module.exports = { listThreads, createThread, getMessages, sendMessage };
