const { Op } = require('sequelize');
const { AbsenceRequest, AbsenceRequestRevision, User } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { logInfo, logError, logSecurity } = require('../utils/logger');

/**
 * SECURITY INVARIANTS:
 * - All queries filter by companyId to prevent cross-company access
 * - Non-owner users can only access their own requests
 * - Status transitions are strictly enforced
 * - IDOR attempts return 404 (no information leakage)
 */

// Valid status transitions (source → allowed targets with required role)
const STATUS_TRANSITIONS = {
    PENDING: {
        APPROVED: 'owner',
        REJECTED: 'owner',
        CHANGES_REQUESTED: 'owner',
        CANCELLED: 'self'
    },
    CHANGES_REQUESTED: {
        PENDING: 'self',    // via resubmit
        CANCELLED: 'self'
    }
};

/**
 * Calculate duration in minutes from time strings (HH:MM or HH:MM:SS)
 */
function calculateDurationMinutes(startTime, endTime) {
    if (!startTime || !endTime) return null;

    const parseTime = (timeStr) => {
        const parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const duration = endMinutes - startMinutes;

    return duration > 0 ? duration : null;
}

/**
 * Check for overlapping APPROVED requests (warning, not blocking)
 */
async function checkOverlaps(employeeId, companyId, startDate, endDate, excludeId) {
    const effectiveEndDate = endDate || startDate;
    const whereClause = {
        employeeId,
        companyId,
        status: 'APPROVED',
        [Op.or]: [
            {
                startDate: { [Op.between]: [startDate, effectiveEndDate] }
            },
            {
                endDate: { [Op.between]: [startDate, effectiveEndDate] }
            },
            {
                [Op.and]: [
                    { startDate: { [Op.lte]: startDate } },
                    {
                        [Op.or]: [
                            { endDate: { [Op.gte]: effectiveEndDate } },
                            { endDate: null, startDate: { [Op.gte]: startDate } }
                        ]
                    }
                ]
            }
        ]
    };

    if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
    }

    const overlapping = await AbsenceRequest.findAll({
        where: whereClause,
        attributes: ['id', 'type', 'startDate', 'endDate', 'status'],
        limit: 5
    });

    return overlapping;
}

// =============================================
// CREATE — any authenticated user
// =============================================
exports.create = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const {
            type, mode, category, startDate, endDate,
            dayPart, startTime, endTime, notes
        } = req.body;

        // Auto-calculate fields
        const is104 = category === 'LEGGE_104';
        const durationMinutes = (type === 'PERMESSO' && mode === 'HOURS')
            ? calculateDurationMinutes(startTime, endTime)
            : null;

        // Overlap check (warning only)
        const overlapping = await checkOverlaps(userId, companyId, startDate, endDate);

        const request = await AbsenceRequest.create({
            employeeId: userId,
            companyId,
            type,
            mode: type === 'FERIE' ? null : mode,
            status: 'PENDING',
            category: type === 'FERIE' ? null : category,
            is104,
            startDate,
            endDate: endDate || null,
            dayPart: dayPart || null,
            startTime: (type === 'PERMESSO' && mode === 'HOURS') ? startTime : null,
            endTime: (type === 'PERMESSO' && mode === 'HOURS') ? endTime : null,
            durationMinutes,
            notes: notes ? notes.trim() : null
        });

        // Reload with employee info
        await request.reload({
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });

        logInfo('Absence request created', {
            requestId: request.id,
            employeeId: userId,
            type,
            mode,
            companyId
        });

        res.status(201).json({
            data: request,
            overlaps: overlapping.length > 0,
            overlappingRequests: overlapping.length > 0 ? overlapping : undefined
        });
    } catch (error) {
        next(error);
    }
};

// =============================================
// LIST MINE — any authenticated user (protect only)
// =============================================
exports.listMine = async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const { status, type, page = 1, limit = 20 } = req.query;

        const where = {
            employeeId: userId,
            companyId
        };

        // Sanitize filters
        if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHANGES_REQUESTED'].includes(status)) {
            where.status = status;
        }
        if (type && ['FERIE', 'PERMESSO'].includes(type)) {
            where.type = type;
        }

        const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
        const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

        const { rows, count } = await AbsenceRequest.findAndCountAll({
            where,
            include: [
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: safeLimit,
            offset
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page, 10),
                limit: safeLimit,
                totalPages: Math.ceil(count / safeLimit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// =============================================
// LIST ALL — owner only, always filter by companyId
// =============================================
exports.listAll = async (req, res, next) => {
    try {
        const companyId = getCompanyId(req);
        const { status, type, employeeId, month, is104, page = 1, limit = 20 } = req.query;

        const where = { companyId };

        // Sanitize all query params
        if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHANGES_REQUESTED'].includes(status)) {
            where.status = status;
        }
        if (type && ['FERIE', 'PERMESSO'].includes(type)) {
            where.type = type;
        }
        if (employeeId) {
            // Sanitize: must be a valid UUID-like string
            if (/^[0-9a-f-]{36}$/i.test(employeeId)) {
                where.employeeId = employeeId;
            }
        }
        if (month) {
            // Expected format: YYYY-MM
            const monthMatch = month.match(/^(\d{4})-(\d{2})$/);
            if (monthMatch) {
                const year = parseInt(monthMatch[1], 10);
                const mon = parseInt(monthMatch[2], 10);
                const startOfMonth = new Date(year, mon - 1, 1);
                const endOfMonth = new Date(year, mon, 0);
                where.startDate = {
                    [Op.between]: [
                        startOfMonth.toISOString().split('T')[0],
                        endOfMonth.toISOString().split('T')[0]
                    ]
                };
            }
        }
        if (is104 === 'true') {
            where.is104 = true;
        }

        const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, Math.max(1, parseInt(limit, 10)));
        const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

        const { rows, count } = await AbsenceRequest.findAndCountAll({
            where,
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: safeLimit,
            offset
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page, 10),
                limit: safeLimit,
                totalPages: Math.ceil(count / safeLimit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// =============================================
// GET BY ID — owner OR own request
// =============================================
exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const isOwner = req.user.role === 'owner';

        const request = await AbsenceRequest.findOne({
            where: { id, companyId },
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: AbsenceRequestRevision,
                    as: 'revisions',
                    include: [{ model: User, as: 'changedByUser', attributes: ['id', 'firstName', 'lastName'] }],
                    order: [['revisionNumber', 'ASC']]
                }
            ]
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        // SECURITY: non-owner can only see own requests
        if (!isOwner && request.employeeId !== userId) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        res.json(request);
    } catch (error) {
        next(error);
    }
};

// =============================================
// APPROVE — owner only
// =============================================
exports.approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const { decisionNote } = req.body;

        const request = await AbsenceRequest.findOne({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        // Strict state transition check
        if (!STATUS_TRANSITIONS[request.status] || !STATUS_TRANSITIONS[request.status].APPROVED) {
            return res.status(400).json({
                message: `Impossibile approvare una richiesta in stato ${request.status}.`
            });
        }

        await request.update({
            status: 'APPROVED',
            decisionBy: userId,
            decisionAt: new Date(),
            decisionNote: decisionNote ? decisionNote.trim() : null
        });

        await request.reload({
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });

        logInfo('Absence request approved', {
            requestId: id,
            approvedBy: userId,
            employeeId: request.employeeId,
            companyId
        });

        res.json(request);
    } catch (error) {
        next(error);
    }
};

// =============================================
// REJECT — owner only, decisionNote required (validated by middleware)
// =============================================
exports.reject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const { decisionNote } = req.body;

        const request = await AbsenceRequest.findOne({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        if (!STATUS_TRANSITIONS[request.status] || !STATUS_TRANSITIONS[request.status].REJECTED) {
            return res.status(400).json({
                message: `Impossibile rifiutare una richiesta in stato ${request.status}.`
            });
        }

        await request.update({
            status: 'REJECTED',
            decisionBy: userId,
            decisionAt: new Date(),
            decisionNote: decisionNote.trim()
        });

        await request.reload({
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });

        logInfo('Absence request rejected', {
            requestId: id,
            rejectedBy: userId,
            employeeId: request.employeeId,
            companyId
        });

        res.json(request);
    } catch (error) {
        next(error);
    }
};

// =============================================
// REQUEST CHANGES — owner only, requestedChanges required (validated by middleware)
// =============================================
exports.requestChanges = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const { requestedChanges } = req.body;

        const request = await AbsenceRequest.findOne({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        if (!STATUS_TRANSITIONS[request.status] || !STATUS_TRANSITIONS[request.status].CHANGES_REQUESTED) {
            return res.status(400).json({
                message: `Impossibile richiedere modifiche su una richiesta in stato ${request.status}.`
            });
        }

        await request.update({
            status: 'CHANGES_REQUESTED',
            decisionBy: userId,
            decisionAt: new Date(),
            requestedChanges: requestedChanges.trim()
        });

        await request.reload({
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });

        logInfo('Absence request changes requested', {
            requestId: id,
            requestedBy: userId,
            employeeId: request.employeeId,
            companyId
        });

        res.json(request);
    } catch (error) {
        next(error);
    }
};

// =============================================
// CANCEL — own request only, PENDING or CHANGES_REQUESTED
// =============================================
exports.cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);

        const request = await AbsenceRequest.findOne({
            where: { id, companyId, employeeId: userId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        if (!STATUS_TRANSITIONS[request.status] || !STATUS_TRANSITIONS[request.status].CANCELLED) {
            return res.status(400).json({
                message: `Impossibile annullare una richiesta in stato ${request.status}.`
            });
        }

        await request.update({ status: 'CANCELLED' });

        logInfo('Absence request cancelled', {
            requestId: id,
            cancelledBy: userId,
            companyId
        });

        res.json({ message: 'Richiesta annullata con successo', data: request });
    } catch (error) {
        next(error);
    }
};

// =============================================
// DELETE — owner: any request; worker: own PENDING/CANCELLED only
// =============================================
exports.deleteRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const isOwner = req.user.role === 'owner';

        const request = await AbsenceRequest.findOne({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        // SECURITY: non-owner can only delete own requests in PENDING/CANCELLED
        if (!isOwner) {
            if (request.employeeId !== userId) {
                return res.status(404).json({ message: 'Richiesta non trovata' });
            }
            if (!['PENDING', 'CANCELLED'].includes(request.status)) {
                return res.status(400).json({
                    message: 'Puoi eliminare solo richieste in attesa o annullate.'
                });
            }
        }

        // Delete associated revisions first
        await AbsenceRequestRevision.destroy({
            where: { absenceRequestId: id }
        });

        await request.destroy();

        logInfo('Absence request deleted', {
            requestId: id,
            deletedBy: userId,
            employeeId: request.employeeId,
            isOwner,
            companyId
        });

        res.json({ message: 'Richiesta eliminata con successo' });
    } catch (error) {
        next(error);
    }
};

// =============================================
// RESUBMIT — own request only, CHANGES_REQUESTED → PENDING
// =============================================
exports.resubmit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const companyId = getCompanyId(req);
        const {
            type, mode, category, startDate, endDate,
            dayPart, startTime, endTime, notes
        } = req.body;

        const request = await AbsenceRequest.findOne({
            where: { id, companyId, employeeId: userId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Richiesta non trovata' });
        }

        if (request.status !== 'CHANGES_REQUESTED') {
            return res.status(400).json({
                message: 'È possibile reinviare solo richieste con stato CHANGES_REQUESTED.'
            });
        }

        // 1. Save revision snapshot (before values)
        const beforeSnapshot = {
            type: request.type,
            mode: request.mode,
            category: request.category,
            startDate: request.startDate,
            endDate: request.endDate,
            dayPart: request.dayPart,
            startTime: request.startTime,
            endTime: request.endTime,
            durationMinutes: request.durationMinutes,
            notes: request.notes,
            decisionNote: request.decisionNote,
            requestedChanges: request.requestedChanges
        };

        await AbsenceRequestRevision.create({
            absenceRequestId: request.id,
            revisionNumber: request.revisionNumber,
            changedBy: userId,
            changes: {
                before: beforeSnapshot,
                after: {
                    type: type || request.type,
                    mode: type === 'FERIE' ? null : (mode || request.mode),
                    category: type === 'FERIE' ? null : (category || request.category),
                    startDate: startDate || request.startDate,
                    endDate: endDate !== undefined ? endDate : request.endDate,
                    dayPart: dayPart !== undefined ? dayPart : request.dayPart,
                    startTime: startTime !== undefined ? startTime : request.startTime,
                    endTime: endTime !== undefined ? endTime : request.endTime,
                    notes: notes !== undefined ? notes : request.notes
                }
            }
        });

        // 2. Calculate new fields
        const newType = type || request.type;
        const newMode = newType === 'FERIE' ? null : (mode || request.mode);
        const is104 = (category || request.category) === 'LEGGE_104';
        const newStartTime = (newType === 'PERMESSO' && newMode === 'HOURS') ? (startTime || request.startTime) : null;
        const newEndTime = (newType === 'PERMESSO' && newMode === 'HOURS') ? (endTime || request.endTime) : null;
        const durationMinutes = calculateDurationMinutes(newStartTime, newEndTime);

        // 3. Update request: increment revision, reset decision fields, set PENDING
        await request.update({
            type: newType,
            mode: newMode,
            category: newType === 'FERIE' ? null : (category || request.category),
            is104,
            startDate: startDate || request.startDate,
            endDate: endDate !== undefined ? (endDate || null) : request.endDate,
            dayPart: dayPart !== undefined ? (dayPart || null) : request.dayPart,
            startTime: newStartTime,
            endTime: newEndTime,
            durationMinutes,
            notes: notes !== undefined ? (notes ? notes.trim() : null) : request.notes,
            status: 'PENDING',
            revisionNumber: request.revisionNumber + 1,
            decisionBy: null,
            decisionAt: null,
            decisionNote: null,
            requestedChanges: null
        });

        // 4. Overlap check (warning)
        const overlapping = await checkOverlaps(
            userId, companyId,
            request.startDate, request.endDate,
            request.id
        );

        await request.reload({
            include: [
                { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] }
            ]
        });

        logInfo('Absence request resubmitted', {
            requestId: id,
            resubmittedBy: userId,
            revisionNumber: request.revisionNumber,
            companyId
        });

        res.json({
            data: request,
            overlaps: overlapping.length > 0,
            overlappingRequests: overlapping.length > 0 ? overlapping : undefined
        });
    } catch (error) {
        next(error);
    }
};
