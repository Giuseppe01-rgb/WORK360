const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Attendance, Material, Equipment, User, ConstructionSite } = require('../models');
const { assertSiteBelongsToCompany } = require('../utils/security');
const { getCompanyId } = require('../utils/sequelizeHelpers');

// @desc    Get hours per employee
// @route   GET /api/analytics/hours-per-employee
// @access  Private (Owner)
const getHoursPerEmployee = async (req, res) => {
    try {
        const { startDate, endDate, siteId } = req.query;
        console.log('DEBUG: getHoursPerEmployee called with:', { startDate, endDate, siteId });

        const companyId = getCompanyId(req);

        // Build where clause
        const where = {
            clockOut: { [Op.ne]: null } // Only completed attendances
        };

        if (siteId) {
            where.siteId = siteId;
        }

        if (startDate && endDate) {
            where['clockIn.time'] = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Get aggregated hours using raw SQL for performance
        const hoursData = await sequelize.query(`
            SELECT 
                u.id as user_id,
                u."firstName" || ' ' || u."lastName" as employee,
                SUM(a."totalHours") as "totalHours",
                COUNT(a.id) as "totalDays",
                AVG(a."totalHours") as "avgHoursPerDay"
            FROM attendances a
            JOIN users u ON a."userId" = u.id
            WHERE u."companyId" = :companyId
              AND a."clockOut" IS NOT NULL
              ${siteId ? 'AND a."siteId" = :siteId' : ''}
              ${startDate ? 'AND (a."clockIn"->\'time\')::timestamp >= :startDate' : ''}
              ${endDate ? 'AND (a."clockIn"->\'time\')::timestamp <= :endDate' : ''}
            GROUP BY u.id, u."firstName", u."lastName"
            ORDER BY "totalHours" DESC
        `, {
            replacements: { companyId, siteId, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        console.log('DEBUG: hoursData found:', hoursData.length, 'records');

        res.json(hoursData.map(d => ({
            employee: d.employee,
            totalHours: parseFloat(d.totalHours || 0),
            totalDays: parseInt(d.totalDays || 0),
            avgHoursPerDay: parseFloat(d.avgHoursPerDay || 0).toFixed(2)
        })));
    } catch (error) {
        console.error('getHoursPerEmployee error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get site report (simplified version)
// @route   GET /api/analytics/site-report/:siteId
// @access  Private (Owner)
const getSiteReport = async (req, res, next) => {
    try {
        const { siteId } = req.params;
        const companyId = getCompanyId(req);

        // Validate siteId
        if (!siteId || siteId === 'undefined' || siteId === 'null') {
            return res.status(400).json({ message: 'ID cantiere non valido' });
        }

        // SECURITY: Verify site belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        // Get materials summary
        const materials = await Material.findAll({
            where: { siteId },
            attributes: [
                'name',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('MAX', sequelize.col('unit')), 'unit'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['name'],
            raw: true
        });

        // Get equipment summary
        const equipment = await Equipment.findAll({
            where: { siteId },
            attributes: [
                'name',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['name'],
            raw: true
        });

        // Get attendance summary
        const attendance = await Attendance.findAll({
            where: {
                siteId,
                clockOut: { [Op.ne]: null }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('totalHours')), 'totalHours'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalDays']
            ],
            raw: true
        });

        res.json({
            materials,
            equipment,
            attendance: attendance[0] || { totalHours: 0, totalDays: 0 }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get employee materials
// @route   GET /api/analytics/employee-materials/:employeeId
// @access  Private (Owner)
const getEmployeeMaterials = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const materials = await Material.findAll({
            where: { userId: employeeId },
            attributes: [
                'name',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('MAX', sequelize.col('unit')), 'unit'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['name'],
            order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
            raw: true
        });

        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'analisi dei materiali', error: error.message });
    }
};

// @desc    Get materials summary
// @route   GET /api/analytics/materials-summary
// @access  Private (Owner)
const getMaterialsSummary = async (req, res) => {
    try {
        const { siteId } = req.query;
        const companyId = getCompanyId(req);

        const where = { companyId };
        if (siteId) where.siteId = siteId;

        const materials = await Material.findAll({
            where,
            attributes: [
                'name',
                'category',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('MAX', sequelize.col('unit')), 'unit']
            ],
            group: ['name', 'category'],
            order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
            raw: true
        });

        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel riepilogo materiali', error: error.message });
    }
};

// @desc    Get dashboard data (placeholder)
// @route   GET /api/analytics/dashboard
// @access  Private (Owner)
const getDashboard = async (req, res) => {
    try {
        // Placeholder - return basic dashboard data
        res.json({
            message: 'Dashboard analytics coming soon',
            stats: {
                totalSites: 0,
                activeSites: 0,
                totalWorkers: 0,
                monthlyHours: 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getHoursPerEmployee,
    getSiteReport,
    getEmployeeMaterials,
    getMaterialsSummary,
    getDashboard
};
