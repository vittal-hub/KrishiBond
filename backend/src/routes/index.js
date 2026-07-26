const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/marketplace', require('./marketplaceRoutes'));
router.use('/contracts', require('./contractRoutes'));
router.use('/messages', require('./messageRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/disputes', require('./disputeRoutes'));
router.use('/help', require('./helpCenterRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

module.exports = router;
