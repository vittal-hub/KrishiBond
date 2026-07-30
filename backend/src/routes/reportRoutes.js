const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.get('/summary', protect, ctrl.getSummary);
router.get('/income', protect, ctrl.getIncomeSummary);
router.get('/crops', protect, ctrl.getCropsSummary);
router.get('/export', protect, ctrl.exportReport);

module.exports = router;
