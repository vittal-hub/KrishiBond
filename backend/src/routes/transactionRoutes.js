const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/transactionController');

const router = express.Router();

router.get('/', protect, ctrl.listMyTransactions);
router.get('/analytics', protect, ctrl.getAnalytics);
router.get('/:id', protect, ctrl.getTransaction);

module.exports = router;
