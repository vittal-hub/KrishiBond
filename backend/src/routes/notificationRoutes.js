const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updatePreferencesSchema } = require('../validators/notificationValidators');
const ctrl = require('../controllers/notificationController');

const router = express.Router();

router.get('/', protect, ctrl.listNotifications);
router.patch('/:id/read', protect, ctrl.markRead);
router.patch('/read-all', protect, ctrl.markAllRead);
router.get('/preferences', protect, ctrl.getPreferences);
router.patch('/preferences', protect, validate(updatePreferencesSchema), ctrl.updatePreferences);

module.exports = router;
