const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.get('/summary', protect, ctrl.getSummary);
router.get('/export', protect, ctrl.exportContracts);

module.exports = router;
