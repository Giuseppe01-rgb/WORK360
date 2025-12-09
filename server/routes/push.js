const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const pushController = require('../controllers/pushController');

// Get VAPID public key (no auth needed)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Subscribe to push notifications (requires auth)
router.post('/subscribe', protect, pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', protect, pushController.unsubscribe);

// Check subscription status
router.get('/status', protect, pushController.checkStatus);

// Send test notification to self
router.post('/test', protect, pushController.sendTestNotification);

module.exports = router;

