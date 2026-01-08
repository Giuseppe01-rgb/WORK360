const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validateMaterialUsage } = require('../middleware/validators');
const {
    recordUsage,
    getTodayUsage,
    getMostUsedBySite,
    getUsageHistory,
    updateUsage,
    deleteUsage
} = require('../controllers/materialUsageController');

// All routes require authentication
router.use(protect);

// Get today's material usage
router.get('/today', protect, getTodayUsage);

// Get most used materials by site
router.get('/most-used/:siteId', protect, getMostUsedBySite);

// Record usage (catalogato flow)
router.post('/', validateMaterialUsage, recordUsage);

// Get usage history
router.get('/', getUsageHistory);

// Update usage
router.put('/:id', updateUsage);

// Delete usage
router.delete('/:id', deleteUsage);

module.exports = router;
