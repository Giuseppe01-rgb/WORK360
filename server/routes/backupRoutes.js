/**
 * Backup Routes - Data Export API
 * Protected endpoints for exporting company data
 */

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Company = require('../models/Company');
const ConstructionSite = require('../models/ConstructionSite');
const Attendance = require('../models/Attendance');
const MaterialUsage = require('../models/MaterialUsage');
const MaterialMaster = require('../models/MaterialMaster');
const WorkActivity = require('../models/WorkActivity');
const Note = require('../models/Note');
const Economia = require('../models/Economia');
const Quote = require('../models/Quote');
const SAL = require('../models/SAL');
const Supplier = require('../models/Supplier');

// Helper to get company ID
const getCompanyId = (req) => {
    return req.user?.companyId || req.user?.company_id;
};

/**
 * @route   GET /api/backup/export-all
 * @desc    Export all company data as JSON
 * @access  Private (Admin only)
 */
router.get('/export-all', protect, async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({ message: 'Company ID not found' });
        }

        console.log(`📦 Starting data export for company: ${companyId}`);
        const exportDate = new Date().toISOString();

        // Export company info
        const company = await Company.findByPk(companyId);

        // Export users (without passwords)
        const users = await User.findAll({
            where: { companyId },
            attributes: { exclude: ['password'] }
        });

        // Export construction sites
        const sites = await ConstructionSite.findAll({
            where: { companyId }
        });

        // Get all site IDs for this company
        const siteIds = sites.map(s => s.id);

        // Export attendances
        const attendances = await Attendance.findAll({
            where: { siteId: siteIds },
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] },
                { model: ConstructionSite, as: 'site', attributes: ['id', 'name'] }
            ]
        });

        // Export material usages
        const materialUsages = await MaterialUsage.findAll({
            where: { siteId: siteIds }
        });

        // Export material catalog
        const materialMasters = await MaterialMaster.findAll({
            where: { companyId }
        });

        // Export work activities (daily reports)
        const workActivities = await WorkActivity.findAll({
            where: { siteId: siteIds }
        });

        // Export notes
        const notes = await Note.findAll({
            where: { siteId: siteIds }
        });

        // Export economie
        const economie = await Economia.findAll({
            where: { siteId: siteIds }
        });

        // Export quotes
        const quotes = await Quote.findAll({
            where: { companyId }
        });

        // Export SALs
        const sals = await SAL.findAll({
            where: { companyId }
        });

        // Export suppliers
        const suppliers = await Supplier.findAll({
            where: { companyId }
        });

        // Calculate summary stats
        const stats = {
            users: users.length,
            sites: sites.length,
            attendances: attendances.length,
            materialUsages: materialUsages.length,
            materialMasters: materialMasters.length,
            workActivities: workActivities.length,
            notes: notes.length,
            economie: economie.length,
            quotes: quotes.length,
            sals: sals.length,
            suppliers: suppliers.length
        };

        // Create export object
        const exportData = {
            exportInfo: {
                exportDate,
                companyId,
                companyName: company?.name || 'Unknown',
                version: '1.0',
                stats
            },
            company,
            users,
            sites,
            attendances,
            materialUsages,
            materialMasters,
            workActivities,
            notes,
            economie,
            quotes,
            sals,
            suppliers
        };

        console.log(`✅ Export complete. Stats:`, stats);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=work360_backup_${exportDate.split('T')[0]}.json`);

        res.json(exportData);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            message: 'Errore durante export dati',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/backup/export-attendances
 * @desc    Export only attendances data
 * @access  Private
 */
router.get('/export-attendances', protect, async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { startDate, endDate, siteId } = req.query;

        // Get sites for this company
        const siteWhere = { companyId };
        if (siteId) siteWhere.id = siteId;

        const sites = await ConstructionSite.findAll({
            where: siteWhere,
            attributes: ['id']
        });
        const siteIds = sites.map(s => s.id);

        // Build attendance query
        const attendanceWhere = { siteId: siteIds };

        const attendances = await Attendance.findAll({
            where: attendanceWhere,
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] },
                { model: ConstructionSite, as: 'site', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const exportDate = new Date().toISOString();

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=work360_attendances_${exportDate.split('T')[0]}.json`);

        res.json({
            exportDate,
            totalRecords: attendances.length,
            attendances
        });

    } catch (error) {
        console.error('Export attendances error:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   GET /api/backup/stats
 * @desc    Get backup statistics without downloading
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const sites = await ConstructionSite.findAll({
            where: { companyId },
            attributes: ['id']
        });
        const siteIds = sites.map(s => s.id);

        const stats = {
            users: await User.count({ where: { companyId } }),
            sites: sites.length,
            attendances: await Attendance.count({ where: { siteId: siteIds } }),
            materialUsages: await MaterialUsage.count({ where: { siteId: siteIds } }),
            materialMasters: await MaterialMaster.count({ where: { companyId } }),
            workActivities: await WorkActivity.count({ where: { siteId: siteIds } }),
            notes: await Note.count({ where: { siteId: siteIds } }),
            economie: await Economia.count({ where: { siteId: siteIds } }),
            quotes: await Quote.count({ where: { companyId } }),
            sals: await SAL.count({ where: { companyId } }),
            suppliers: await Supplier.count({ where: { companyId } }),
            lastBackupCheck: new Date().toISOString()
        };

        res.json(stats);

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
