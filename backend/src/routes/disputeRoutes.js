const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { raiseDisputeSchema, disputeCommentSchema } = require('../validators/messageValidators');
const ctrl = require('../controllers/disputeController');

const router = express.Router();

router.get('/', protect, ctrl.listDisputes);
router.post('/', protect, validate(raiseDisputeSchema), ctrl.createDispute);
router.get('/:id', protect, ctrl.getDispute);
router.post('/:id/comments', protect, validate(disputeCommentSchema), ctrl.addComment);
router.patch('/:id/resolve', protect, ctrl.resolveDispute);

module.exports = router;
