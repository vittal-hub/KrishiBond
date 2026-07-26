const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, ctrl.listNotifications);
router.patch('/:id/read', protect, ctrl.markRead);
router.patch('/read-all', protect, ctrl.markAllRead);

module.exports = router;
