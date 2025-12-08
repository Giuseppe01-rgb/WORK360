const { Op } = require('sequelize');
const { Attendance, ConstructionSite, User } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');

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
        const site = await ConstructionSite.findByPk(siteId);
        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }
        if (site.companyId !== getCompanyId(req)) {
            return res.status(403).json({ message: 'Non autorizzato a timbrare su questo cantiere' });
        }

        // Check if user already has an active attendance (not clocked out)
        const activeAttendance = await Attendance.findOne({
            where: {
                userId: req.user._id,
                clockOut: null
            }
        });

        if (activeAttendance) {
            return res.status(400).json({ message: 'Hai già timbrato l\'entrata. Devi prima timbrare l\'uscita.' });
        }

        // Fallback for coordinates if missing
        const lat = latitude || 0;
        const lng = longitude || 0;

        const attendance = await Attendance.create({
            userId: req.user._id,
            siteId: siteId,
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
            return res.status(400).json({ message: 'ID presence mancante' });
        }

        const attendance = await Attendance.findByPk(attendanceId);
        if (!attendance) {
            return res.status(404).json({ message: 'Presenza non trovata' });
        }

        if (attendance.userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        if (attendance.clockOut) {
            return res.status(400).json({ message: 'Hai già timbrato l\'uscita per questa presenza' });
        }

        const lat = latitude || 0;
        const lng = longitude || 0;
        const clockOutTime = new Date();
        const clockInTime = new Date(attendance.clockIn.time);
        const totalHours = ((clockOutTime - clockInTime) / (1000 * 60 * 60)).toFixed(2);

        await attendance.update({
            clockOut: {
                time: clockOutTime,
                location: {
                    type: 'Point',
                    coordinates: [lng, lat],
                    address
                }
            },
            totalHours: parseFloat(totalHours)
        });

        res.json(attendance);
    } catch (error) {
        console.error('ClockOut Error:', error);
        res.status(500).json({ message: 'Errore nella timbratura d\'uscita', error: error.message });
    }
};

// @desc    Get my attendance records
// @route   GET /api/attendance/my-attendance
// @access  Private
const getMyAttendance = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {
            userId: req.user._id
        };

        if (startDate || endDate) {
            where['clockIn.time'] = {};
            if (startDate) where['clockIn.time'][Op.gte] = new Date(startDate);
            if (endDate) where['clockIn.time'][Op.lte] = new Date(endDate);
        }

        const attendance = await Attendance.findAll({
            where,
            include: [{
                model: ConstructionSite,
                as: 'site',
                attributes: ['id', 'name', 'address']
            }],
            order: [['clockIn', 'DESC']]
        });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero presenze', error: error.message });
    }
};

// @desc    Get active attendance
// @route   GET /api/attendance/active
// @access  Private
const getActiveAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findOne({
            where: {
                userId: req.user._id,
                clockOut: null
            },
            include: [{
                model: ConstructionSite,
                as: 'site',
                attributes: ['id', 'name', 'address']
            }]
        });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero presenza attiva', error: error.message });
    }
};

// @desc    Get all attendance for company (Owner only)
// @route   GET /api/attendance
// @access  Private (Owner)
const getAllAttendance = async (req, res) => {
    try {
        const { siteId, userId, startDate, endDate } = req.query;

        const where = {};

        if (siteId) where.siteId = siteId;
        if (userId) where.userId = userId;

        if (startDate || endDate) {
            where['clockIn.time'] = {};
            if (startDate) where['clockIn.time'][Op.gte] = new Date(startDate);
            if (endDate) where['clockIn.time'][Op.lte] = new Date(endDate);
        }

        const attendance = await Attendance.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'username'],
                    where: { companyId: getCompanyId(req) }
                },
                {
                    model: ConstructionSite,
                    as: 'site',
                    attributes: ['id', 'name', 'address']
                }
            ],
            order: [['clockIn', 'DESC']]
        });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero presenze', error: error.message });
    }
};

// Placeholder functions for other endpoints (simplified for migration)
const createManualAttendance = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora implementata in PostgreSQL' });
};

const bulkCreateAttendances = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora implementata in PostgreSQL' });
};

const updateAttendance = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora implementata in PostgreSQL' });
};

const deleteAttendance = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora implementata in PostgreSQL' });
};

module.exports = {
    clockIn,
    clockOut,
    getMyAttendance,
    getActiveAttendance,
    getAllAttendance,
    createManualAttendance,
    bulkCreateAttendances,
    updateAttendance,
    deleteAttendance
};