const Attendance = require('../models/Attendance');

// @desc    Clock in
// @route   POST /api/attendance/clock-in
// @access  Private (Worker/Owner)
const clockIn = async (req, res) => {
    try {
        console.log('ClockIn Body:', req.body);
        const { siteId, latitude, longitude, address } = req.body;

        // Validate Site ID
        if (!siteId) {
            return res.status(400).json({ message: 'Cantiere obbligatorio' });
        }

        // Check if user already has an active attendance (not clocked out)
        const activeAttendance = await Attendance.findOne({
            user: req.user._id,
            'clockOut.time': { $exists: false }
        });

        if (activeAttendance) {
            return res.status(400).json({ message: 'Hai già timbrato l\'entrata. Devi prima timbrare l\'uscita.' });
        }

        // Fallback for coordinates if missing (e.g. GPS error or permission denied but handled poorly)
        const lat = latitude || 0;
        const lng = longitude || 0;

        const attendance = await Attendance.create({
            user: req.user._id,
            site: siteId,
            clockIn: {
                time: new Date(),
                location: {
                    type: 'Point',
                    coordinates: [lng, lat],
                    address
                }
            }
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('ClockIn Error:', error);
        res.status(500).json({ message: 'Errore nella timbratura d\'entrata', error: error.message });
    }
};

// @desc    Clock out
// @route   POST /api/attendance/clock-out
// @access  Private (Worker/Owner)
const clockOut = async (req, res) => {
    try {
        console.log('ClockOut Body:', req.body);
        const { attendanceId, latitude, longitude, address } = req.body;

        if (!attendanceId) {
            console.log('ClockOut Error: Missing attendanceId');
            return res.status(400).json({ message: 'ID timbratura mancante' });
        }

        const attendance = await Attendance.findById(attendanceId);

        if (!attendance) {
            console.log('ClockOut Error: Attendance not found', attendanceId);
            return res.status(404).json({ message: 'Timbratura non trovata' });
        }

        if (attendance.user.toString() !== req.user._id.toString()) {
            console.log('ClockOut Error: Unauthorized');
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        if (attendance.clockOut && attendance.clockOut.time) {
            console.log('ClockOut Error: Already clocked out');
            return res.status(400).json({ message: 'Hai già timbrato l\'uscita per questa presenza' });
        }

        const clockOutTime = new Date();
        const totalHours = (clockOutTime - attendance.clockIn.time) / (1000 * 60 * 60); // Convert to hours

        const lat = latitude || 0;
        const lng = longitude || 0;

        attendance.clockOut = {
            time: clockOutTime,
            location: {
                type: 'Point',
                coordinates: [lng, lat],
                address
            }
        };
        attendance.totalHours = totalHours;

        await attendance.save();

        console.log('ClockOut Success:', attendance._id);
        res.json(attendance);
    } catch (error) {
        console.error('ClockOut Error:', error);
        res.status(500).json({ message: 'Errore nella timbratura d\'uscita', error: error.message });
    }
};

// @desc    Get my attendance records
// @route   GET /api/attendance/my-records
// @access  Private (Worker/Owner)
const getMyAttendance = async (req, res) => {
    try {
        const { startDate, endDate, siteId } = req.query;

        const query = { user: req.user._id };

        if (siteId) {
            query.site = siteId;
        }

        if (startDate || endDate) {
            query['clockIn.time'] = {};
            if (startDate) query['clockIn.time'].$gte = new Date(startDate);
            if (endDate) query['clockIn.time'].$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('site', 'name address')
            .sort({ 'clockIn.time': -1 });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero delle presenze', error: error.message });
    }
};

// @desc    Get active attendance (not clocked out yet)
// @route   GET /api/attendance/active
// @access  Private (Worker/Owner)
const getActiveAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findOne({
            user: req.user._id,
            'clockOut.time': { $exists: false }
        }).populate('site', 'name address');

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero della presenza attiva', error: error.message });
    }
};

// @desc    Get all attendance (Owner only)
// @route   GET /api/attendance/all
// @access  Private (Owner)
const getAllAttendance = async (req, res) => {
    try {
        const { startDate, endDate, siteId, userId } = req.query;

        const query = {};

        // Filter by company
        const User = require('../models/User');
        const companyUsers = await User.find({ company: req.user.company._id }).select('_id');
        query.user = { $in: companyUsers.map(u => u._id) };

        if (siteId) {
            query.site = siteId;
        }

        if (userId) {
            query.user = userId;
        }

        if (startDate || endDate) {
            query['clockIn.time'] = {};
            if (startDate) query['clockIn.time'].$gte = new Date(startDate);
            if (endDate) query['clockIn.time'].$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('user', 'firstName lastName username')
            .populate('site', 'name address')
            .sort({ 'clockIn.time': -1 });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero delle presenze', error: error.message });
    }
};

module.exports = {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance
};
