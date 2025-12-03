const express = require('express');
const router = express.Router();
const {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance,
    createManualAttendance,
    updateAttendance,
    deleteAttendance
} = require('../controllers/attendanceController');
const { protect, requireWorker, requireOwner } = require('../middleware/authMiddleware');

router.post('/clock-in', protect, requireWorker, clockIn);
router.post('/clock-out', protect, requireWorker, clockOut);
router.get('/my-records', protect, requireWorker, getMyAttendance);
router.get('/active', protect, requireWorker, getActiveAttendance);
router.get('/all', protect, requireOwner, getAllAttendance);

// Manual attendance management (Owner only)
router.post('/manual', protect, requireOwner, createManualAttendance);
router.put('/:id', protect, requireOwner, updateAttendance);
router.delete('/:id', protect, requireOwner, deleteAttendance);

module.exports = router;
