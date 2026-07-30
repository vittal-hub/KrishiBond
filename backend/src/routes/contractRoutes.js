const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createContractSchema,
  createBidSchema,
  bidActionSchema,
  milestoneSchema,
  escrowFundSchema,
  demoCompleteSchema,
  statusReasonSchema,
  signContractSchema,
  clauseSchema,
  verifyPaymentSchema,
  releaseEscrowSchema,
} = require('../validators/contractValidators');
const { restrictTo } = require('../middleware/role');

const contractCtrl = require('../controllers/contractController');
const negotiationCtrl = require('../controllers/negotiationController');
const paymentCtrl = require('../controllers/paymentController');

const router = express.Router();

router.get('/', protect, contractCtrl.listContracts);
router.post('/', protect, validate(createContractSchema), contractCtrl.createContract);
router.get('/milestones/upcoming', protect, contractCtrl.getUpcomingMilestones);
router.get('/:id', protect, contractCtrl.getContract);
router.get('/:id/timeline', protect, contractCtrl.getTimeline);
router.patch('/:id/status', protect, contractCtrl.updateContractStatus);

router.post('/:id/accept', protect, contractCtrl.acceptContract);
router.post('/:id/complete', protect, contractCtrl.completeContract);
router.post('/:id/reject', protect, validate(statusReasonSchema), contractCtrl.rejectContract);
router.post('/:id/cancel', protect, validate(statusReasonSchema), contractCtrl.cancelContract);
router.post('/:id/sign', protect, validate(signContractSchema), contractCtrl.signContract);
router.post('/:id/clauses', protect, validate(clauseSchema), contractCtrl.addClause);

router.post('/:id/milestones', protect, validate(milestoneSchema), contractCtrl.addMilestone);
router.patch('/:id/milestones/:milestoneId/complete', protect, contractCtrl.completeMilestone);

router.get('/:contractId/bids', protect, negotiationCtrl.listBids);
router.post('/:contractId/bids', protect, validate(createBidSchema), negotiationCtrl.createBid);
router.patch('/bids/:bidId', protect, validate(bidActionSchema), negotiationCtrl.respondToBid);
router.post('/:contractId/bids/:bidId/accept', protect, (req, res, next) => {
  req.body.action = 'accept';
  negotiationCtrl.respondToBid(req, res, next);
});
router.post('/:contractId/bids/:bidId/reject', protect, (req, res, next) => {
  req.body.action = 'reject';
  negotiationCtrl.respondToBid(req, res, next);
});

router.get('/:contractId/payments', protect, paymentCtrl.listPayments);
router.post('/:contractId/payments/fund', protect, validate(escrowFundSchema), paymentCtrl.fundEscrow);
router.post('/:contractId/payments/demo/initiate', protect, validate(escrowFundSchema), paymentCtrl.initiateDemoPayment);
router.post(
  '/:contractId/payments/:paymentId/demo/complete',
  protect,
  validate(demoCompleteSchema),
  paymentCtrl.completeDemoPayment
);
router.post('/:contractId/payments/:paymentId/verify', protect, validate(verifyPaymentSchema), paymentCtrl.verifyPayment);
router.patch('/:contractId/payments/:paymentId/release', protect, validate(releaseEscrowSchema), paymentCtrl.releaseEscrow);
router.post('/:contractId/payments/:paymentId/refund', protect, restrictTo('admin'), paymentCtrl.refundEscrow);

module.exports = router;
