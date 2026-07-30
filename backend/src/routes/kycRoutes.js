const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const { submitKycSchema, reviewKycSchema } = require('../validators/kycValidators');
const ctrl = require('../controllers/kycController');

const router = express.Router();

router.post('/', protect, validate(submitKycSchema), ctrl.submitKyc);
router.get('/me', protect, ctrl.getMyKyc);

router.get('/', protect, restrictTo('admin'), ctrl.listKyc);
router.patch('/:id/approve', protect, restrictTo('admin'), ctrl.approveKyc);
router.patch('/:id/reject', protect, restrictTo('admin'), validate(reviewKycSchema), ctrl.rejectKyc);

module.exports = router;
