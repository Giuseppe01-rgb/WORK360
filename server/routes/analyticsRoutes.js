const express = require('express');
const router = express.Router();
const {
    getHoursPerEmployee,
    getSiteReport,
    getEmployeeMaterials,
    getDashboard
} = require('../controllers/analyticsController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

router.get('/hours-per-employee', protect, requireOwner, getHoursPerEmployee);
router.get('/site-report/:siteId', protect, requireOwner, getSiteReport);
router.get('/employee-materials/:employeeId', protect, requireOwner, getEmployeeMaterials);
router.get('/dashboard', protect, requireOwner, getDashboard);

module.exports = router;
