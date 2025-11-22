const express = require('express');
const router = express.Router();
const {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance
} = require('../controllers/attendanceController');
const { protect, requireWorker, requireOwner } = require('../middleware/authMiddleware');

router.post('/clock-in', protect, requireWorker, clockIn);
router.post('/clock-out', protect, requireWorker, clockOut);
router.get('/my-records', protect, requireWorker, getMyAttendance);
router.get('/active', protect, requireWorker, getActiveAttendance);
router.get('/all', protect, requireOwner, getAllAttendance);

module.exports = router;
