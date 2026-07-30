const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const validate = require('../middleware/validate');
const { chatUpload, verifyFileSignature } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimiter');
const { raiseDisputeSchema, disputeCommentSchema, resolveDisputeSchema } = require('../validators/messageValidators');
const ctrl = require('../controllers/disputeController');

const router = express.Router();

router.get('/', protect, ctrl.listDisputes);
router.post('/', protect, writeLimiter, validate(raiseDisputeSchema), ctrl.createDispute);
router.get('/:id', protect, ctrl.getDispute);
router.post('/:id/comments', protect, writeLimiter, validate(disputeCommentSchema), ctrl.addComment);
router.post('/:id/evidence', protect, chatUpload.single('file'), verifyFileSignature, ctrl.addEvidence);
router.patch('/:id/resolve', protect, restrictTo('admin'), validate(resolveDisputeSchema), ctrl.resolveDispute);

module.exports = router;
