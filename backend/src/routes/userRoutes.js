const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { updateMeSchema } = require('../validators/userValidators');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.put('/me', protect, validate(updateMeSchema), ctrl.updateMe);
router.get('/:id', protect, ctrl.getUserById);

module.exports = router;
