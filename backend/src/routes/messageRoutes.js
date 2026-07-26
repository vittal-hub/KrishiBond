const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createThreadSchema, sendMessageSchema } = require('../validators/messageValidators');
const ctrl = require('../controllers/messageController');

const router = express.Router();

router.get('/threads', protect, ctrl.listThreads);
router.post('/threads', protect, validate(createThreadSchema), ctrl.createThread);
router.get('/threads/:threadId', protect, ctrl.getMessages);
router.post('/threads/:threadId', protect, validate(sendMessageSchema), ctrl.sendMessage);

module.exports = router;
