const Attendance = require('../models/Attendance');
const ConstructionSite = require('../models/ConstructionSite');
const User = require('../models/User');

// @desc    Clock in
// @route   POST /api/attendance/clock-in
// @access  Private (Worker/Owner)
const clockIn = async (req, res) => {
    try {
        console.log('ClockIn Body:', req.body);
        const { siteId, latitude, longitude, address } = req.body;

        // Validate coordinates if provided
        if ((latitude && isNaN(parseFloat(latitude))) || (longitude && isNaN(parseFloat(longitude)))) {
            return res.status(400).json({ message: 'Coordinate GPS non valide' });
        }

        // Validate Site ID
        if (!siteId) {
            return res.status(400).json({ message: 'Cantiere obbligatorio' });
        }

        // Verify site belongs to user's company
        const site = await ConstructionSite.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }
        if (site.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato a timbrare su questo cantiere' });
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

        // Validate coordinates if provided
        if ((latitude && isNaN(parseFloat(latitude))) || (longitude && isNaN(parseFloat(longitude)))) {
            return res.status(400).json({ message: 'Coordinate GPS non valide' });
        }

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
            // Verify site belongs to user's company
            const site = await ConstructionSite.findById(siteId);
            if (!site || site.company.toString() !== req.user.company._id.toString()) {
                return res.status(403).json({ message: 'Cantiere non valido' });
            }
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
        const companyUsers = await User.find({ company: req.user.company._id }).select('_id');
        query.user = { $in: companyUsers.map(u => u._id) };

        if (siteId) {
            query.site = siteId;
        }

        if (userId) {
            // Ensure userId is within the company
            const isUserInCompany = companyUsers.some(u => u._id.toString() === userId);
            if (!isUserInCompany) {
                return res.status(403).json({ message: 'Utente non trovato nella tua azienda' });
            }
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

// @desc    Create manual attendance (Owner only)
// @route   POST /api/attendance/manual
// @access  Private (Owner)
const createManualAttendance = async (req, res) => {
    try {
        const { userId, siteId, clockInTime, clockOutTime, notes } = req.body;

        // Validation
        if (!userId || !siteId || !clockInTime) {
            return res.status(400).json({ message: 'Operaio, cantiere e ora entrata sono obbligatori' });
        }

        // Verify user belongs to owner's company
        const user = await User.findById(userId);
        if (!user || user.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Operaio non trovato nella tua azienda' });
        }

        // Verify site belongs to owner's company
        const site = await ConstructionSite.findById(siteId);
        if (!site || site.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Cantiere non trovato nella tua azienda' });
        }

        // Validate times if clockOut is provided
        const clockInDate = new Date(clockInTime);
        let totalHours = 0;

        if (clockOutTime) {
            const clockOutDate = new Date(clockOutTime);
            if (clockOutDate <= clockInDate) {
                return res.status(400).json({ message: 'L\'ora di uscita deve essere dopo l\'ora di entrata' });
            }
            totalHours = (clockOutDate - clockInDate) / (1000 * 60 * 60);
        }

        // Create attendance
        const attendanceData = {
            user: userId,
            site: siteId,
            clockIn: {
                time: clockInDate,
                location: {
                    type: 'Point',
                    coordinates: [0, 0], // Manual attendance doesn't have GPS
                    address: 'Manuale'
                }
            },
            notes
        };

        if (clockOutTime) {
            attendanceData.clockOut = {
                time: new Date(clockOutTime),
                location: {
                    type: 'Point',
                    coordinates: [0, 0],
                    address: 'Manuale'
                }
            };
            attendanceData.totalHours = totalHours;
        }

        const attendance = await Attendance.create(attendanceData);

        const populatedAttendance = await Attendance.findById(attendance._id)
            .populate('user', 'firstName lastName username')
            .populate('site', 'name address');

        res.status(201).json(populatedAttendance);
    } catch (error) {
        console.error('Create manual attendance error:', error);
        res.status(500).json({ message: 'Errore nella creazione della presenza', error: error.message });
    }
};

// @desc    Update attendance (Owner only)
// @route   PUT /api/attendance/:id
// @access  Private (Owner)
const updateAttendance = async (req, res) => {
    try {
        const { clockInTime, clockOutTime, siteId, notes } = req.body;

        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Presenza non trovata' });
        }

        // Verify attendance belongs to owner's company
        const user = await User.findById(attendance.user);
        if (!user || user.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        // Update site if provided
        if (siteId) {
            const site = await ConstructionSite.findById(siteId);
            if (!site || site.company.toString() !== req.user.company._id.toString()) {
                return res.status(403).json({ message: 'Cantiere non valido' });
            }
            attendance.site = siteId;
        }

        // Update clockIn time if provided
        if (clockInTime) {
            attendance.clockIn.time = new Date(clockInTime);
        }

        // Update clockOut time if provided
        if (clockOutTime) {
            attendance.clockOut = attendance.clockOut || {};
            attendance.clockOut.time = new Date(clockOutTime);
            attendance.clockOut.location = attendance.clockOut.location || {
                type: 'Point',
                coordinates: [0, 0],
                address: 'Manuale'
            };
        }

        // Recalculate totalHours if both times exist
        if (attendance.clockIn.time && attendance.clockOut && attendance.clockOut.time) {
            if (attendance.clockOut.time <= attendance.clockIn.time) {
                return res.status(400).json({ message: 'L\'ora di uscita deve essere dopo l\'ora di entrata' });
            }
            attendance.totalHours = (attendance.clockOut.time - attendance.clockIn.time) / (1000 * 60 * 60);
        }

        // Update notes if provided
        if (notes !== undefined) {
            attendance.notes = notes;
        }

        await attendance.save();

        const populatedAttendance = await Attendance.findById(attendance._id)
            .populate('user', 'firstName lastName username')
            .populate('site', 'name address');

        res.json(populatedAttendance);
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento della presenza', error: error.message });
    }
};

// @desc    Delete attendance (Owner only)
// @route   DELETE /api/attendance/:id
// @access  Private (Owner)
const deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Presenza non trovata' });
        }

        // Verify attendance belongs to owner's company
        const user = await User.findById(attendance.user);
        if (!user || user.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        await attendance.deleteOne();

        res.json({ message: 'Presenza eliminata con successo' });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione della presenza', error: error.message });
    }
};

module.exports = {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance,
    createManualAttendance,
    updateAttendance,
    deleteAttendance
};