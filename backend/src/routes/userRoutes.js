const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.put('/me', protect, ctrl.updateMe);
router.get('/:id', protect, ctrl.getUserById);

module.exports = router;
