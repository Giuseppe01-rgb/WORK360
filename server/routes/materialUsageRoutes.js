const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    recordUsage,
    getTodayUsage,
    getMostUsedBySite,
    getUsageHistory,
    deleteUsage
} = require('../controllers/materialUsageController');

// All routes require authentication
router.use(protect);

// Get today's material usage
router.get('/today', protect, getTodayUsage);

// Get most used materials by site
router.get('/most-used/:siteId', protect, getMostUsedBySite);

// Record usage (catalogato flow)
router.post('/', recordUsage);

// Get usage history

module.exports = router;
