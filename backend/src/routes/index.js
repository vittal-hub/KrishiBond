const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/kyc', require('./kycRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/marketplace', require('./marketplaceRoutes'));
router.use('/contracts', require('./contractRoutes'));
router.use('/wallet', require('./walletRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/messages', require('./messageRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/disputes', require('./disputeRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/help', require('./helpCenterRoutes'));
router.use('/admin', require('./adminRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

module.exports = router;
