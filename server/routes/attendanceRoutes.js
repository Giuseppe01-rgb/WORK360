const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance,
    createManualAttendance,
    bulkCreateAttendances,
    updateAttendance,
    deleteAttendance,
    importFromExcel
} = require('../controllers/attendanceController');
const { protect, requireWorker, requireOwner } = require('../middleware/authMiddleware');

// Configure multer for memory storage (Excel files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Formato file non supportato. Usa .xlsx, .xls o .csv'), false);
        }
    }
});

router.post('/clock-in', protect, requireWorker, clockIn);
router.post('/clock-out', protect, requireWorker, clockOut);
router.get('/my-records', protect, requireWorker, getMyAttendance);
router.get('/active', protect, requireWorker, getActiveAttendance);
router.get('/all', protect, requireOwner, getAllAttendance);

// Manual attendance management (Owner only)
router.post('/manual', protect, requireOwner, createManualAttendance);
router.post('/bulk', protect, requireOwner, bulkCreateAttendances);
router.post('/import-excel', protect, requireOwner, upload.single('file'), importFromExcel);
router.put('/:id', protect, requireOwner, updateAttendance);
router.delete('/:id', protect, requireOwner, deleteAttendance);

module.exports = router;

