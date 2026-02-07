/**
 * Audit Log Controller
 * Handles API endpoints for viewing audit logs
 */

const { Op } = require('sequelize');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { getCompanyId } = require('../utils/sequelizeHelpers');

/**
 * Get audit logs for company
 * @route GET /api/audit-logs
 * @access Private (Owner only)
 */
const getAuditLogs = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { from, to, userId, action, targetType, limit = 100, offset = 0 } = req.query;

        // Build where clause
        const where = { companyId };

        // Date range filter
        if (from || to) {
            where.createdAt = {};
            if (from) {
                where.createdAt[Op.gte] = new Date(from);
            }
            if (to) {
                where.createdAt[Op.lte] = new Date(to);
            }
        }

        // User filter
        if (userId) {
            where.userId = userId;
        }

        // Action filter
        if (action) {
            where.action = action;
        }

        // Target type filter
        if (targetType) {
            where.targetType = targetType;
        }

        // Query with pagination
        const { count, rows: logs } = await AuditLog.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'username']
            }],
            order: [['createdAt', 'DESC']],
            limit: Math.min(Number.parseInt(limit), 500),
            offset: Number.parseInt(offset)
        });

        // Format response
        const formattedLogs = logs.map(log => ({
            id: log.id,
            createdAt: log.createdAt,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
            user: log.user ? {
                id: log.user.id,
                name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.username
            } : null,
            ipAddress: log.ipAddress,
            meta: log.meta
        }));

        res.json({
            total: count,
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            logs: formattedLogs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Errore nel recupero dei log', error: error.message });
    }
};

/**
 * Get distinct action types for filtering
 * @route GET /api/audit-logs/actions
 * @access Private (Owner only)
 */
const getActionTypes = async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const actions = await AuditLog.findAll({
            where: { companyId },
            attributes: ['action'],
            group: ['action'],
            order: [['action', 'ASC']]
        });

        res.json(actions.map(a => a.action));
    } catch (error) {
        console.error('Error fetching action types:', error);
        res.status(500).json({ message: 'Errore nel recupero dei tipi di azione', error: error.message });
    }
};

module.exports = {
    getAuditLogs,
    getActionTypes
};
