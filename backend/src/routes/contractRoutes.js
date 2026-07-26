const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createContractSchema,
  createBidSchema,
  bidActionSchema,
  milestoneSchema,
  escrowFundSchema,
} = require('../validators/contractValidators');

const contractCtrl = require('../controllers/contractController');
const negotiationCtrl = require('../controllers/negotiationController');
const paymentCtrl = require('../controllers/paymentController');

const router = express.Router();

router.get('/', protect, contractCtrl.listContracts);
router.post('/', protect, validate(createContractSchema), contractCtrl.createContract);
router.get('/:id', protect, contractCtrl.getContract);
router.patch('/:id/status', protect, contractCtrl.updateContractStatus);

router.post('/:id/milestones', protect, validate(milestoneSchema), contractCtrl.addMilestone);
router.patch('/:id/milestones/:milestoneId/complete', protect, contractCtrl.completeMilestone);

router.get('/:contractId/bids', protect, negotiationCtrl.listBids);
router.post('/:contractId/bids', protect, validate(createBidSchema), negotiationCtrl.createBid);
router.patch('/bids/:bidId', protect, validate(bidActionSchema), negotiationCtrl.respondToBid);

router.get('/:contractId/payments', protect, paymentCtrl.listPayments);
router.post('/:contractId/payments/fund', protect, validate(escrowFundSchema), paymentCtrl.fundEscrow);
router.patch('/:contractId/payments/:paymentId/release', protect, paymentCtrl.releaseEscrow);

module.exports = router;
