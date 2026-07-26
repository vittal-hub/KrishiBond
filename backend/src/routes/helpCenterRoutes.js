const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { supportTicketSchema } = require('../validators/messageValidators');
const ctrl = require('../controllers/helpCenterController');

const router = express.Router();

router.get('/faqs', ctrl.listFaqs);
router.post('/tickets', protect, validate(supportTicketSchema), ctrl.createTicket);
router.get('/tickets', protect, ctrl.listMyTickets);

module.exports = router;
