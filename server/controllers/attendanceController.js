const { Op } = require('sequelize');
const { Attendance, ConstructionSite, User } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { logAction, AUDIT_ACTIONS } = require('../utils/auditLogger');

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
                userId: getUserId(req),
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
            userId: getUserId(req),
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

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.CLOCK_IN,
            targetType: 'attendance',
            targetId: attendance.id,
            ipAddress: req.ip,
            meta: { siteId, siteName: site.name }
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

        if (attendance.userId !== getUserId(req)) {
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

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.CLOCK_OUT,
            targetType: 'attendance',
            targetId: attendance.id,
            ipAddress: req.ip,
            meta: { siteId: attendance.siteId, totalHours }
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
            userId: getUserId(req)
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
                userId: getUserId(req),
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
    try {
        const { userId, siteId, date, clockIn, clockOut, notes, totalHours } = req.body;
        const companyId = getCompanyId(req);

        if (!userId || !siteId || !date) {
            return res.status(400).json({ message: 'userId, siteId e date sono obbligatori' });
        }

        // Verify site belongs to company
        const site = await ConstructionSite.findOne({ where: { id: siteId, companyId } });
        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        // Verify user belongs to company
        const user = await User.findOne({ where: { id: userId, companyId } });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Build clockIn/clockOut JSONB
        const clockInData = clockIn ? { time: new Date(`${date}T${clockIn}:00+01:00`), location: null } : null;
        const clockOutData = clockOut ? { time: new Date(`${date}T${clockOut}:00+01:00`), location: null } : null;

        // Calculate hours if both present
        let hours = totalHours || 0;
        if (clockInData && clockOutData && !totalHours) {
            hours = (new Date(clockOutData.time) - new Date(clockInData.time)) / (1000 * 60 * 60);
        }

        const attendance = await Attendance.create({
            userId,
            siteId,
            clockIn: clockInData,
            clockOut: clockOutData,
            totalHours: hours,
            notes: notes || null
        });

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId,
            action: AUDIT_ACTIONS.CLOCK_IN,
            targetType: 'attendance',
            targetId: attendance.id,
            ipAddress: req.ip,
            meta: { siteId, siteName: site.name, manual: true, workerUserId: userId }
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('createManualAttendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const bulkCreateAttendances = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        let attendancesToCreate = [];

        // Support both old format (attendances array) and new format (workers + siteId + dates)
        if (req.body.attendances && Array.isArray(req.body.attendances)) {
            // Old format: direct array of attendance objects
            attendancesToCreate = req.body.attendances;
        } else if (req.body.workers && req.body.siteId && req.body.dates) {
            // New format: workers array, siteId, dates array
            const { workers, siteId, dates } = req.body;

            // Create attendance entries for each worker × date combination
            for (const workerId of workers) {
                for (const dateEntry of dates) {
                    attendancesToCreate.push({
                        userId: workerId,
                        siteId: siteId,
                        date: dateEntry.date,
                        clockIn: dateEntry.clockIn,
                        clockOut: dateEntry.clockOut,
                        notes: dateEntry.notes || ''
                    });
                }
            }
        } else {
            return res.status(400).json({ message: 'Array di presenze richiesto o workers/siteId/dates' });
        }

        if (attendancesToCreate.length === 0) {
            return res.status(400).json({ message: 'Nessuna presenza da creare' });
        }

        const results = { created: 0, errors: [] };

        for (let i = 0; i < attendancesToCreate.length; i++) {
            const att = attendancesToCreate[i];
            try {
                const { userId, siteId, date, clockIn, clockOut, notes, totalHours } = att;

                console.log(`Processing attendance ${i + 1}/${attendancesToCreate.length}:`, { userId, siteId, date, clockIn, clockOut });

                // Verify site
                const site = await ConstructionSite.findOne({ where: { id: siteId, companyId } });
                if (!site) {
                    console.log(`Site not found for siteId: ${siteId}, companyId: ${companyId}`);
                    results.errors.push({ index: i, error: 'Cantiere non trovato' });
                    continue;
                }

                const clockInData = clockIn ? { time: new Date(`${date}T${clockIn}:00+01:00`), location: null } : null;
                const clockOutData = clockOut ? { time: new Date(`${date}T${clockOut}:00+01:00`), location: null } : null;

                let hours = totalHours || 0;
                if (clockInData && clockOutData && !totalHours) {
                    hours = (new Date(clockOutData.time) - new Date(clockInData.time)) / (1000 * 60 * 60);
                }

                console.log(`Creating attendance with hours: ${hours}`);

                await Attendance.create({
                    userId,
                    siteId,
                    clockIn: clockInData,
                    clockOut: clockOutData,
                    totalHours: hours,
                    notes: notes || null
                });
                results.created++;
                console.log(`Successfully created attendance ${i + 1}`);
            } catch (rowError) {
                console.error(`Error creating attendance ${i + 1}:`, rowError.message);
                results.errors.push({ index: i, error: rowError.message });
            }
        }

        console.log('Bulk create finished:', results);

        res.json({
            message: `${results.created}/${attendancesToCreate.length} presenze create`,
            created: results.created,
            total: attendancesToCreate.length,
            errors: results.errors,
            results
        });
    } catch (error) {
        console.error('bulkCreateAttendances error:', error);
        res.status(500).json({ message: error.message });
    }
};

const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);
        const { clockIn, clockOut, clockInTime, clockOutTime, notes, totalHours } = req.body;

        console.log('updateAttendance called with:', { id, clockInTime, clockOutTime, notes });

        // Find the attendance and verify it belongs to company
        const attendance = await Attendance.findByPk(id, {
            include: [{ model: ConstructionSite, as: 'site' }]
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Presenza non trovata' });
        }

        if (attendance.site.companyId !== companyId) {
            return res.status(403).json({ message: 'Non autorizzato a modificare questa presenza' });
        }

        // Build update object
        const updateData = {};

        // Handle clockInTime string format from frontend (datetime-local input)
        if (clockInTime) {
            console.log('Setting clockIn to:', clockInTime);
            updateData.clockIn = {
                time: new Date(clockInTime),
                location: attendance.clockIn?.location || null
            };
        } else if (clockIn !== undefined) {
            updateData.clockIn = clockIn;
        }

        // Handle clockOutTime string format from frontend
        if (clockOutTime) {
            console.log('Setting clockOut to:', clockOutTime);
            updateData.clockOut = {
                time: new Date(clockOutTime),
                location: attendance.clockOut?.location || null
            };
        } else if (clockOut !== undefined) {
            updateData.clockOut = clockOut;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Calculate totalHours
        const newClockIn = updateData.clockIn?.time || attendance.clockIn?.time;
        const newClockOut = updateData.clockOut?.time || attendance.clockOut?.time;
        if (newClockIn && newClockOut) {
            const start = new Date(newClockIn);
            const end = new Date(newClockOut);
            updateData.totalHours = parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2));
            console.log('Calculated totalHours:', updateData.totalHours);
        } else if (totalHours !== undefined) {
            updateData.totalHours = totalHours;
        }

        console.log('Updating attendance with:', JSON.stringify(updateData, null, 2));

        // Use update() directly on the model
        await Attendance.update(updateData, {
            where: { id: id }
        });

        // Fetch the updated record to return
        const updatedAttendance = await Attendance.findByPk(id, {
            include: [
                { model: ConstructionSite, as: 'site' },
                { model: User, as: 'user' }
            ]
        });

        console.log('Updated attendance clockIn:', updatedAttendance.clockIn);
        console.log('Updated attendance clockOut:', updatedAttendance.clockOut);

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId,
            action: AUDIT_ACTIONS.ATTENDANCE_UPDATED,
            targetType: 'attendance',
            targetId: id,
            ipAddress: req.ip,
            meta: { siteId: attendance.siteId, siteName: attendance.site?.name }
        });

        res.json(updatedAttendance);
    } catch (error) {
        console.error('updateAttendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);

        // Find the attendance and verify it belongs to company
        const attendance = await Attendance.findByPk(id, {
            include: [{ model: ConstructionSite, as: 'site' }]
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Presenza non trovata' });
        }

        if (attendance.site.companyId !== companyId) {
            return res.status(403).json({ message: 'Non autorizzato a eliminare questa presenza' });
        }

        // Save info for audit log
        const attendanceInfo = { siteId: attendance.siteId, siteName: attendance.site?.name };

        await attendance.destroy();

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId,
            action: AUDIT_ACTIONS.ATTENDANCE_DELETED,
            targetType: 'attendance',
            targetId: id,
            ipAddress: req.ip,
            meta: attendanceInfo
        });

        res.json({ message: 'Presenza eliminata con successo' });
    } catch (error) {
        console.error('deleteAttendance error:', error);
        res.status(500).json({ message: error.message });
    }
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