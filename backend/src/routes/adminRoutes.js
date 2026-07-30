const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const validate = require('../middleware/validate');
const { suspendUserSchema, updateTicketSchema, updatePaymentStatusSchema } = require('../validators/adminValidators');
const ctrl = require('../controllers/adminController');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', ctrl.getStats);

router.get('/users', ctrl.listUsers);
router.patch('/users/:id/suspend', validate(suspendUserSchema), ctrl.suspendUser);
router.patch('/users/:id/reactivate', ctrl.reactivateUser);

router.get('/tickets', ctrl.listTickets);
router.patch('/tickets/:id', validate(updateTicketSchema), ctrl.updateTicket);

router.get('/audit-logs', ctrl.listAuditLogs);

router.get('/payments', ctrl.listPayments);
router.patch('/payments/:id/status', validate(updatePaymentStatusSchema), ctrl.updatePaymentStatus);

module.exports = router;
