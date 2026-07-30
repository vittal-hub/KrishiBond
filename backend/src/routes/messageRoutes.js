const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { chatUpload, verifyFileSignature } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimiter');
const { createThreadSchema, sendMessageSchema } = require('../validators/messageValidators');
const ctrl = require('../controllers/messageController');

const router = express.Router();

router.get('/threads', protect, ctrl.listThreads);
router.post('/threads', protect, validate(createThreadSchema), ctrl.createThread);
router.get('/threads/:threadId', protect, ctrl.getMessages);
// Text messages intentionally aren't rate-limited beyond the global apiLimiter -
// real-time chat can legitimately exceed a low per-window cap.
router.post('/threads/:threadId', protect, validate(sendMessageSchema), ctrl.sendMessage);
router.post('/threads/:threadId/attachments', protect, writeLimiter, chatUpload.single('file'), verifyFileSignature, ctrl.uploadAttachment);

module.exports = router;
