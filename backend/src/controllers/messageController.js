const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const { notifyUser } = require('../utils/notify');
const { toThreadDTO, toMessageDTO } = require('../utils/dto');
const { uploadChatAttachment } = require('../services/upload.service');

const DEFAULT_PAGE_SIZE = 30;

function assertParticipant(thread, userId) {
  if (!thread.participants.some((p) => p.toString() === userId.toString())) {
    throw new ApiError(403, 'Not a participant of this thread');
  }
}

const listThreads = asyncHandler(async (req, res) => {
  const threads = await Thread.find({ participants: req.user._id })
    .populate('participants', 'name role')
    .sort({ lastMessageAt: -1 });

  const threadIds = threads.map((t) => t._id);
  const unreadCounts = await Message.aggregate([
    { $match: { thread: { $in: threadIds }, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } } },
    { $group: { _id: '$thread', count: { $sum: 1 } } },
  ]);
  const unreadByThread = Object.fromEntries(unreadCounts.map((u) => [u._id.toString(), u.count]));

  res.json({
    success: true,
    threads: threads.map((t) => toThreadDTO(t, req.user._id, unreadByThread[t._id.toString()] || 0)),
  });
});

const createThread = asyncHandler(async (req, res) => {
  const { recipientId, contractId, listingId } = req.body;
  if (recipientId === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot start a conversation with yourself');
  }

  let thread = await Thread.findOne({
    participants: { $all: [req.user._id, recipientId], $size: 2 },
    contract: contractId || null,
  });

  if (!thread) {
    thread = await Thread.create({
      participants: [req.user._id, recipientId],
      contract: contractId || undefined,
      listing: listingId || undefined,
    });
  }
  await thread.populate('participants', 'name role');
  res.status(201).json({ success: true, thread: toThreadDTO(thread, req.user._id, 0) });
});

const getMessages = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId).populate('participants', 'name role');
  if (!thread) throw new ApiError(404, 'Thread not found');
  assertParticipant(thread, req.user._id);

  const { before, limit = DEFAULT_PAGE_SIZE } = req.query;
  const limitNum = Math.min(parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 100);
  const filter = { thread: thread._id };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const page = await Message.find(filter).populate('sender', 'name').sort({ createdAt: -1 }).limit(limitNum);
  const messages = page.reverse();
  const hasMore = page.length === limitNum;

  // Mark everything in this thread as read by the current user.
  const unreadIds = await Message.find({ thread: thread._id, readBy: { $ne: req.user._id } }).select('_id');
  if (unreadIds.length > 0) {
    await Message.updateMany({ _id: { $in: unreadIds.map((m) => m._id) } }, { $addToSet: { readBy: req.user._id } });
    const io = req.app.get('io');
    if (io) io.to(`thread:${thread._id}`).emit('thread:seen', { threadId: thread._id.toString(), userId: req.user._id.toString() });
  }

  res.json({
    success: true,
    thread: toThreadDTO(thread, req.user._id, 0),
    messages: messages.map((m) => toMessageDTO(m, req.user._id)),
    hasMore,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) throw new ApiError(404, 'Thread not found');
  assertParticipant(thread, req.user._id);

  const message = await Message.create({
    thread: thread._id,
    sender: req.user._id,
    type: 'text',
    body: req.body.body,
    readBy: [req.user._id],
  });
  await message.populate('sender', 'name');

  thread.lastMessageAt = new Date();
  thread.lastMessage = { body: req.body.body, type: 'text', sender: req.user._id };
  await thread.save();

  const io = req.app.get('io');
  const dto = toMessageDTO(message, req.user._id);
  if (io) io.to(`thread:${thread._id}`).emit('message:new', dto);

  const recipients = thread.participants.filter((p) => p.toString() !== req.user._id.toString());
  await Promise.all(
    recipients.map((r) =>
      notifyUser(io, r, {
        type: 'message',
        category: 'message',
        message: `New message from ${req.user.name}`,
        link: `/messages/${thread._id}`,
      })
    )
  );

  res.status(201).json({ success: true, message: dto });
});

const uploadAttachment = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.threadId);
  if (!thread) throw new ApiError(404, 'Thread not found');
  assertParticipant(thread, req.user._id);
  if (!req.file) throw new ApiError(400, 'No file was provided');

  const { url, kind } = await uploadChatAttachment(req.file, `krishibond/chat/${thread._id}`);

  const message = await Message.create({
    thread: thread._id,
    sender: req.user._id,
    type: kind,
    attachments: [url],
    readBy: [req.user._id],
  });
  await message.populate('sender', 'name');

  thread.lastMessageAt = new Date();
  thread.lastMessage = { body: kind === 'voice' ? 'Voice note' : kind === 'image' ? 'Photo' : 'File', type: kind, sender: req.user._id };
  await thread.save();

  const io = req.app.get('io');
  const dto = toMessageDTO(message, req.user._id);
  if (io) io.to(`thread:${thread._id}`).emit('message:new', dto);

  const recipients = thread.participants.filter((p) => p.toString() !== req.user._id.toString());
  await Promise.all(
    recipients.map((r) =>
      notifyUser(io, r, {
        type: 'message',
        category: 'message',
        message: `New ${kind} from ${req.user.name}`,
        link: `/messages/${thread._id}`,
      })
    )
  );

  res.status(201).json({ success: true, message: dto });
});

module.exports = { listThreads, createThread, getMessages, sendMessage, uploadAttachment };
