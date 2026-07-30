const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/walletController');

const router = express.Router();

router.get('/me', protect, ctrl.getMyWallet);

module.exports = router;
