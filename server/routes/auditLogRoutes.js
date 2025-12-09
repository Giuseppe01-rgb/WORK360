/**
 * Audit Log Routes
 * API endpoints for viewing audit logs (owner only)
 */

const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { getAuditLogs, getActionTypes } = require('../controllers/auditLogController');

// All routes require authentication and owner role
router.use(protect);
router.use(requireOwner);

// GET /api/audit-logs - Get audit logs with filters
router.get('/', getAuditLogs);

// GET /api/audit-logs/actions - Get distinct action types
router.get('/actions', getActionTypes);

module.exports = router;
