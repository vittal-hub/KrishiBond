const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const { notifyUser } = require('../utils/notify');
const { toThreadDTO, toMessageDTO } = require('../utils/dto');
const { uploadChatAttachment } = require('../services/upload.service');

const DEFAULT_PAGE_SIZE = 30;

// `thread.participants` entries are plain ObjectIds on a fresh fetch but
// full User documents once `.populate('participants', ...)` has run (as
// getMessages does, to return the counterparty's name/role). Calling
// `.toString()` on a populated document returns "[object Object]", not its
// id, which made this check incorrectly reject genuine participants opening
// their own chat. Resolving `_id` first makes the check populate-safe.
function idOf(ref) {
  return (ref && ref._id ? ref._id : ref).toString();
}

function assertParticipant(thread, userId) {
  if (!thread.participants.some((p) => idOf(p) === userId.toString())) {
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

  const filter = {
    participants: { $all: [req.user._id, recipientId], $size: 2 },
    contract: contractId || null,
  };

  // A true atomic upsert isn't possible here: MongoDB refuses to build an
  // insert document from a query that combines `$all` and `$size` on the
  // same array field ("cannot infer query fields to set, path 'participants'
  // is matched twice"), no matter what is or isn't also passed via
  // $setOnInsert. Falling back to find-then-create; the actual real-world
  // double-create trigger (Messages.jsx firing startThread twice under
  // StrictMode/rapid navigation) is fixed at the source with a ref guard
  // there instead.
  let thread = await Thread.findOne(filter);
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

  const { clientId } = req.body;

  // Idempotent send: if this exact compose action (identified by the
  // client-generated id) already produced a message - e.g. the first
  // response timed out on a slow connection and the user pressed send again -
  // return the message that already exists instead of inserting (and
  // re-broadcasting) a second copy.
  if (clientId) {
    const existing = await Message.findOne({ thread: thread._id, clientId }).populate('sender', 'name');
    if (existing) {
      return res.status(200).json({ success: true, message: toMessageDTO(existing, req.user._id) });
    }
  }

  let message;
  try {
    message = await Message.create({
      thread: thread._id,
      sender: req.user._id,
      type: 'text',
      body: req.body.body,
      readBy: [req.user._id],
      clientId,
    });
  } catch (err) {
    if (err.code === 11000 && clientId) {
      const existing = await Message.findOne({ thread: thread._id, clientId }).populate('sender', 'name');
      if (existing) return res.status(200).json({ success: true, message: toMessageDTO(existing, req.user._id) });
    }
    throw err;
  }
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

  const { clientId } = req.body;
  if (clientId) {
    const existing = await Message.findOne({ thread: thread._id, clientId }).populate('sender', 'name');
    if (existing) {
      return res.status(200).json({ success: true, message: toMessageDTO(existing, req.user._id) });
    }
  }

  const { url, kind } = await uploadChatAttachment(req.file, `krishibond/chat/${thread._id}`);

  let message;
  try {
    message = await Message.create({
      thread: thread._id,
      sender: req.user._id,
      type: kind,
      attachments: [url],
      readBy: [req.user._id],
      clientId,
    });
  } catch (err) {
    if (err.code === 11000 && clientId) {
      const existing = await Message.findOne({ thread: thread._id, clientId }).populate('sender', 'name');
      if (existing) return res.status(200).json({ success: true, message: toMessageDTO(existing, req.user._id) });
    }
    throw err;
  }
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
