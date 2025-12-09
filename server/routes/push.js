const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const pushController = require('../controllers/pushController');

// Get VAPID public key (no auth needed)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Subscribe to push notifications (requires auth)
router.post('/subscribe', auth, pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', auth, pushController.unsubscribe);

// Check subscription status
router.get('/status', auth, pushController.checkStatus);

// Send test notification to self
router.post('/test', auth, pushController.sendTestNotification);

module.exports = router;
