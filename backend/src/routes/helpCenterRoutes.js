const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiter');
const { supportTicketSchema } = require('../validators/messageValidators');
const { createFaqSchema, updateFaqSchema } = require('../validators/faqValidators');
const ctrl = require('../controllers/helpCenterController');

const router = express.Router();

router.get('/faqs', ctrl.listFaqs);
router.post('/tickets', protect, writeLimiter, validate(supportTicketSchema), ctrl.createTicket);
router.get('/tickets', protect, ctrl.listMyTickets);

router.post('/faqs', protect, restrictTo('admin'), validate(createFaqSchema), ctrl.createFaq);
router.patch('/faqs/:id', protect, restrictTo('admin'), validate(updateFaqSchema), ctrl.updateFaq);
router.delete('/faqs/:id', protect, restrictTo('admin'), ctrl.deleteFaq);

module.exports = router;
