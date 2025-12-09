/**
 * Audit Logger Utility
 * Centralized utility for logging actions to the audit trail
 */

const AuditLog = require('../models/AuditLog');

/**
 * Log an action to the audit trail
 * @param {Object} params - Action parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.companyId - ID of the company
 * @param {string} params.action - Action type (e.g., 'SITE_CREATED', 'CLOCKIN')
 * @param {string} [params.targetType] - Type of target (e.g., 'site', 'material')
 * @param {string} [params.targetId] - ID of the target object
 * @param {string} [params.ipAddress] - IP address of the request
 * @param {Object} [params.meta] - Additional metadata
 * @returns {Promise<AuditLog>} - The created audit log entry
 */
async function logAction({ userId, companyId, action, targetType, targetId, ipAddress, meta }) {
    try {
        if (!companyId || !action) {
            console.warn('[AuditLog] Missing required fields: companyId or action');
            return null;
        }

        const auditLog = await AuditLog.create({
            userId: userId || null,
            companyId,
            action,
            targetType: targetType || null,
            targetId: targetId ? String(targetId) : null,
            ipAddress: ipAddress || null,
            meta: meta || {}
        });

        return auditLog;
    } catch (error) {
        // Don't throw - audit logging should not break main operations
        console.error('[AuditLog] Failed to log action:', error.message);
        return null;
    }
}

/**
 * Standard action types for consistency
 */
const AUDIT_ACTIONS = {
    // Sites
    SITE_CREATED: 'SITE_CREATED',
    SITE_UPDATED: 'SITE_UPDATED',
    SITE_DELETED: 'SITE_DELETED',

    // Materials
    MATERIAL_ADDED: 'MATERIAL_ADDED',
    MATERIAL_UPDATED: 'MATERIAL_UPDATED',
    MATERIAL_DELETED: 'MATERIAL_DELETED',
    MATERIAL_USAGE_RECORDED: 'MATERIAL_USAGE_RECORDED',
    MATERIAL_REPORTED: 'MATERIAL_REPORTED',

    // Attendance
    CLOCK_IN: 'CLOCK_IN',
    CLOCK_OUT: 'CLOCK_OUT',

    // Economia
    ECONOMIA_CREATED: 'ECONOMIA_CREATED',
    ECONOMIA_DELETED: 'ECONOMIA_DELETED',

    // Notes
    NOTE_CREATED: 'NOTE_CREATED',
    NOTE_DELETED: 'NOTE_DELETED',

    // Work Activities
    WORK_ACTIVITY_CREATED: 'WORK_ACTIVITY_CREATED',
    WORK_ACTIVITY_UPDATED: 'WORK_ACTIVITY_UPDATED',
    WORK_ACTIVITY_DELETED: 'WORK_ACTIVITY_DELETED',

    // Company
    COMPANY_DATA_EXPORTED: 'COMPANY_DATA_EXPORTED',
    COMPANY_UPDATED: 'COMPANY_UPDATED',

    // Auth
    USER_LOGIN: 'USER_LOGIN',
    USER_REGISTERED: 'USER_REGISTERED'
};

module.exports = {
    logAction,
    AUDIT_ACTIONS
};
