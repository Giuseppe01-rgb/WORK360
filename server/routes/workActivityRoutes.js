const express = require('express');
const router = express.Router();
const {
    create: createActivity, // Renaming 'create' to 'createActivity' for clarity if needed, or just keep 'create'
    getAll: getActivities, // Renaming 'getAll' to 'getActivities'
    distributeTime,
    getAnalytics,
    deleteActivity
} = require('../controllers/workActivityController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Create a new work activity
router.post('/', createActivity);

// Get work activities with filters
router.get('/', getActivities);

// Distribute time percentages and calculate duration hours
router.put('/distribute-time', distributeTime);

// Get analytics data
router.get('/analytics', getAnalytics);

router.delete('/:id', deleteActivity);

module.exports = router;
