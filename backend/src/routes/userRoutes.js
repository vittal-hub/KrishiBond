const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { imageUpload, verifyFileSignature } = require('../middleware/upload');
const { updateMeSchema } = require('../validators/userValidators');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.put('/me', protect, validate(updateMeSchema), ctrl.updateMe);
router.post('/me/signature', protect, imageUpload.single('signature'), verifyFileSignature, ctrl.uploadSignature);
router.get('/:id', protect, ctrl.getUserById);

module.exports = router;
