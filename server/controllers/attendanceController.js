const { Op } = require('sequelize');
const { Attendance, ConstructionSite, User } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { logAction, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { calculateWorkedHours } = require('../utils/workedHoursCalculator');

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

        // Get user's current hourly cost to store with attendance
        const user = await User.findByPk(getUserId(req), { attributes: ['hourlyCost'] });
        const hourlyCost = parseFloat(user?.hourlyCost) || 0;

        const attendance = await Attendance.create({
            userId: getUserId(req),
            siteId: siteId,
            hourlyCost: hourlyCost,
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

        // Calculate worked hours with automatic lunch break deduction
        const { workedHours } = calculateWorkedHours(clockInTime, clockOutTime);

        await attendance.update({
            clockOut: {
                time: clockOutTime,
                location: {
                    type: 'Point',
                    coordinates: [lng, lat],
                    address
                }
            },
            totalHours: workedHours
        });

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.CLOCK_OUT,
            targetType: 'attendance',
            targetId: attendance.id,
            ipAddress: req.ip,
            meta: { siteId: attendance.siteId, totalHours: workedHours }
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

        // Calculate worked hours with automatic lunch break deduction
        let hours = totalHours || 0;
        if (clockInData && clockOutData && !totalHours) {
            const { workedHours } = calculateWorkedHours(clockInData.time, clockOutData.time);
            hours = workedHours;
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

// Helper function to build attendances from new format (workers + siteId + dates)
const buildAttendancesFromNewFormat = (workers, siteId, dates) => {
    const attendances = [];
    for (const workerId of workers) {
        for (const dateEntry of dates) {
            attendances.push({
                userId: workerId,
                siteId: siteId,
                date: dateEntry.date,
                clockIn: dateEntry.clockIn,
                clockOut: dateEntry.clockOut,
                notes: dateEntry.notes || ''
            });
        }
    }
    return attendances;
};

// Helper function to process a single attendance entry
const processSingleAttendance = async (att, companyId) => {
    const { userId, siteId, date, clockIn, clockOut, notes, totalHours } = att;

    // Verify site
    const site = await ConstructionSite.findOne({ where: { id: siteId, companyId } });
    if (!site) {
        throw new Error('Cantiere non trovato');
    }

    // Get user's current hourly cost
    const user = await User.findByPk(userId, { attributes: ['hourlyCost'] });
    const hourlyCost = parseFloat(user?.hourlyCost) || 0;

    const clockInData = clockIn ? { time: new Date(`${date}T${clockIn}:00+01:00`), location: null } : null;
    const clockOutData = clockOut ? { time: new Date(`${date}T${clockOut}:00+01:00`), location: null } : null;

    // Calculate worked hours with automatic lunch break deduction
    let hours = totalHours || 0;
    if (clockInData && clockOutData && !totalHours) {
        const { workedHours } = calculateWorkedHours(clockInData.time, clockOutData.time);
        hours = workedHours;
    }

    await Attendance.create({
        userId,
        siteId,
        hourlyCost,
        clockIn: clockInData,
        clockOut: clockOutData,
        totalHours: hours,
        notes: notes || null
    });
};

const bulkCreateAttendances = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        let attendancesToCreate = [];

        // Support both old format (attendances array) and new format (workers + siteId + dates)
        if (req.body.attendances && Array.isArray(req.body.attendances)) {
            attendancesToCreate = req.body.attendances;
        } else if (req.body.workers && req.body.siteId && req.body.dates) {
            attendancesToCreate = buildAttendancesFromNewFormat(
                req.body.workers,
                req.body.siteId,
                req.body.dates
            );
        } else {
            return res.status(400).json({ message: 'Array di presenze richiesto o workers/siteId/dates' });
        }

        if (attendancesToCreate.length === 0) {
            return res.status(400).json({ message: 'Nessuna presenza da creare' });
        }

        const results = { created: 0, errors: [] };

        for (let i = 0; i < attendancesToCreate.length; i++) {
            try {
                await processSingleAttendance(attendancesToCreate[i], companyId);
                results.created++;
            } catch (rowError) {
                console.error(`Error creating attendance ${i + 1}:`, rowError.message);
                results.errors.push({ index: i, error: rowError.message });
            }
        }

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
            // Add timezone to prevent UTC interpretation
            const clockInWithTz = clockInTime.includes('+') ? clockInTime : clockInTime + ':00+01:00';
            updateData.clockIn = {
                time: new Date(clockInWithTz),
                location: attendance.clockIn?.location || null
            };
        } else if (clockIn !== undefined) {
            updateData.clockIn = clockIn;
        }

        // Handle clockOutTime string format from frontend
        if (clockOutTime) {
            console.log('Setting clockOut to:', clockOutTime);
            // Add timezone to prevent UTC interpretation
            const clockOutWithTz = clockOutTime.includes('+') ? clockOutTime : clockOutTime + ':00+01:00';
            updateData.clockOut = {
                time: new Date(clockOutWithTz),
                location: attendance.clockOut?.location || null
            };
        } else if (clockOut !== undefined) {
            updateData.clockOut = clockOut;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Calculate totalHours with lunch break deduction
        const newClockIn = updateData.clockIn?.time || attendance.clockIn?.time;
        const newClockOut = updateData.clockOut?.time || attendance.clockOut?.time;
        if (newClockIn && newClockOut) {
            const { workedHours } = calculateWorkedHours(newClockIn, newClockOut);
            updateData.totalHours = workedHours;
            console.log('Calculated totalHours with lunch break:', updateData.totalHours);
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

// @desc    Import attendance from Excel file
// @route   POST /api/attendance/import-excel
// @access  Private (Owner)
const importFromExcel = async (req, res) => {
    const { parseAttendanceExcel, mapRowToAttendance, validateAttendance, findEmployee, findSite } = require('../utils/attendanceExcelParser');
    const { calculateWorkedHours } = require('../utils/workedHoursCalculator');

    try {
        const companyId = getCompanyId(req);
        const preview = req.query.preview === 'true';

        if (!req.file) {
            return res.status(400).json({ message: 'File Excel richiesto' });
        }

        // Parse Excel file
        const rows = parseAttendanceExcel(req.file.buffer);
        console.log(`Parsed ${rows.length} rows from Excel`);

        // Get all users for this company (workers + owners)
        const workers = await User.findAll({
            where: { companyId },
            attributes: ['id', 'firstName', 'lastName', 'username', 'role']
        });

        // Get all sites for this company
        const sites = await ConstructionSite.findAll({
            where: { companyId },
            attributes: ['id', 'name']
        });

        // Get default site (first active one) or null
        const defaultSite = sites.length > 0 ? sites[0] : null;

        const results = {
            stats: {
                totalRows: rows.length,
                validAttendances: 0,
                errorRows: 0,
                duplicateRows: 0
            },
            attendances: [],
            errors: [],
            duplicates: []
        };

        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const attendance = mapRowToAttendance(row);

            // Validate
            const validationErrors = validateAttendance(attendance, i);
            if (validationErrors.length > 0) {
                results.errors.push(...validationErrors);
                results.stats.errorRows++;
                continue;
            }

            // Find employee
            const employee = findEmployee(attendance.employeeName, workers);
            if (!employee) {
                results.errors.push(`Riga ${i + 2}: Dipendente "${attendance.employeeName}" non trovato`);
                results.stats.errorRows++;
                continue;
            }

            // Find site (from Excel or use default)
            let site = null;
            if (attendance.siteName) {
                site = findSite(attendance.siteName, sites);
                if (!site) {
                    results.errors.push(`Riga ${i + 2}: Cantiere "${attendance.siteName}" non trovato`);
                    results.stats.errorRows++;
                    continue;
                }
            } else {
                site = defaultSite;
            }

            if (!site) {
                results.errors.push(`Riga ${i + 2}: Nessun cantiere specificato e nessun cantiere disponibile`);
                results.stats.errorRows++;
                continue;
            }

            // Build attendance data
            const attendanceData = {
                row: i + 2,
                userId: employee.id,
                employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.username,
                siteId: site.id,
                siteName: site.name,
                date: attendance.date,
                hours: attendance.hours,
                clockIn: attendance.clockIn,
                clockOut: attendance.clockOut
            };

            results.attendances.push(attendanceData);
            results.stats.validAttendances++;
        }

        // If preview mode, return stats without creating
        if (preview) {
            return res.json({
                preview: true,
                ...results
            });
        }

        // Actually create attendances
        let importedCount = 0;
        const createErrors = [];

        for (const att of results.attendances) {
            try {
                const clockInData = {
                    time: new Date(`${att.date}T${att.clockIn}:00+01:00`),
                    location: null
                };
                const clockOutData = {
                    time: new Date(`${att.date}T${att.clockOut}:00+01:00`),
                    location: null
                };

                // Calculate worked hours
                const { workedHours } = calculateWorkedHours(clockInData.time, clockOutData.time);

                // Get user's current hourly cost
                const user = await User.findByPk(att.userId, { attributes: ['hourlyCost'] });
                const hourlyCost = parseFloat(user?.hourlyCost) || 0;

                await Attendance.create({
                    userId: att.userId,
                    siteId: att.siteId,
                    hourlyCost,
                    clockIn: clockInData,
                    clockOut: clockOutData,
                    totalHours: workedHours,
                    notes: `Importato da Excel - ${att.hours}h`
                });

                importedCount++;
            } catch (err) {
                createErrors.push({ row: att.row, error: err.message });
            }
        }

        res.json({
            preview: false,
            importedCount,
            stats: results.stats,
            errors: [...results.errors, ...createErrors.map(e => `Riga ${e.row}: ${e.error}`)]
        });

    } catch (error) {
        console.error('importFromExcel error:', error);
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
    deleteAttendance,
    importFromExcel
};