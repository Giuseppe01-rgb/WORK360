const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Attendance, Material, Equipment, User, ConstructionSite, MaterialUsage, MaterialMaster, WorkActivity } = require('../models');
const { assertSiteBelongsToCompany } = require('../utils/security');
const { getCompanyId } = require('../utils/sequelizeHelpers');
const { getSiteMarginInfo } = require('../utils/marginCalculator');

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
                u.first_name,
                u.last_name,
                u.username,
                u.hourly_cost,
                u.first_name || ' ' || u.last_name as employee,
                SUM(a.total_hours) as total_hours,
                COUNT(a.id) as total_days,
                AVG(a.total_hours) as avg_hours_per_day
            FROM attendances a
            JOIN users u ON a.user_id = u.id
            WHERE u.company_id = :companyId
              AND a.clock_out IS NOT NULL
              ${siteId ? 'AND a.site_id = :siteId' : ''}
              ${startDate ? 'AND (a.clock_in->>\'time\')::timestamp >= :startDate' : ''}
              ${endDate ? 'AND (a.clock_in->>\'time\')::timestamp <= :endDate' : ''}
            GROUP BY u.id, u.first_name, u.last_name, u.username, u.hourly_cost
            ORDER BY total_hours DESC
        `, {
            replacements: { companyId, siteId, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        console.log('DEBUG: hoursData found:', hoursData.length, 'records');

        // Format response to match frontend expectations
        res.json(hoursData.map(d => ({
            id: {
                id: d.user_id,
                firstName: d.first_name,
                lastName: d.last_name,
                username: d.username,
                hourlyCost: parseFloat(d.hourly_cost) || 0
            },
            employee: d.employee,
            totalHours: parseFloat(d.total_hours || 0),
            totalDays: parseInt(d.total_days || 0),
            avgHoursPerDay: parseFloat(d.avg_hours_per_day || 0).toFixed(2)
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

        // Get the site to get contractValue
        const site = await ConstructionSite.findByPk(siteId);

        // Get materials summary from material_usages (linked to material_masters)
        const materials = await sequelize.query(`
            SELECT 
                mm.id,
                mm.display_name as name,
                mm.unit,
                mm.price as "unitPrice",
                SUM(mu.numero_confezioni) as "totalQuantity",
                SUM(mu.numero_confezioni * COALESCE(mm.price, 0)) as "totalCost"
            FROM material_usages mu
            LEFT JOIN material_masters mm ON mu.material_id = mm.id
            WHERE mu.site_id = :siteId
              AND mu.stato = 'catalogato'
            GROUP BY mm.id, mm.display_name, mm.unit, mm.price
            ORDER BY "totalCost" DESC
        `, {
            replacements: { siteId },
            type: sequelize.QueryTypes.SELECT
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

        // Get attendance summary (completed attendances)
        const completedAttendance = await Attendance.findAll({
            where: {
                siteId,
                clockOut: { [Op.ne]: null }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total_hours')), 'totalHours'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalDays']
            ],
            raw: true
        });

        // Get in-progress attendances (no clockOut) and calculate live hours
        const inProgressAttendances = await Attendance.findAll({
            where: {
                siteId,
                clockOut: null
            },
            attributes: ['id', 'clockIn', 'createdAt'],
            raw: true
        });

        // Calculate live hours for in-progress attendances
        let liveHours = 0;
        const now = new Date();
        inProgressAttendances.forEach(att => {
            const clockInTime = att.clockIn?.time ? new Date(att.clockIn.time) : new Date(att.createdAt);
            const diffMs = now - clockInTime;
            if (diffMs > 0) {
                liveHours += diffMs / 3600000; // Convert to hours
            }
        });

        // Calculate costs - include both completed and live hours
        const completedHours = parseFloat(completedAttendance[0]?.totalHours || 0);
        const totalHours = completedHours + liveHours;
        const laborCost = totalHours * 25; // Default hourly rate

        // Calculate materials cost from material_usages
        const materialUsages = await sequelize.query(`
            SELECT 
                SUM(mu.numero_confezioni * COALESCE(mm.price, 0)) as total_cost
            FROM material_usages mu
            LEFT JOIN material_masters mm ON mu.material_id = mm.id
            WHERE mu.site_id = :siteId
              AND mu.stato = 'catalogato'
        `, {
            replacements: { siteId },
            type: sequelize.QueryTypes.SELECT
        });

        const materialsCost = parseFloat(materialUsages[0]?.total_cost || 0);
        const totalCost = laborCost + materialsCost;

        // Calculate percentages (avoid division by zero)
        const materialsIncidencePercent = totalCost > 0 ? (materialsCost / totalCost) * 100 : 0;
        const laborIncidencePercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;

        // Get contractValue and calculate margin
        const contractValue = parseFloat(site?.contractValue) || 0;
        const marginCurrentValue = contractValue - totalCost;
        const marginCurrentPercent = contractValue > 0 ? (marginCurrentValue / contractValue) * 100 : 0;
        const costVsRevenuePercent = contractValue > 0 ? (totalCost / contractValue) * 100 : 0;

        // Get daily reports from WorkActivity (work activities submitted by workers)
        const dailyReports = await WorkActivity.findAll({
            where: { siteId },
            include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
            order: [['date', 'DESC']],
            limit: 50
        });

        // Get employee hours breakdown for this site (completed attendances only)
        const employeeHoursData = await sequelize.query(`
            SELECT 
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.username,
                u.hourly_cost,
                COALESCE(SUM(CASE WHEN a.clock_out IS NOT NULL THEN a.total_hours ELSE 0 END), 0) as completed_hours,
                COUNT(CASE WHEN a.clock_out IS NOT NULL THEN 1 END) as completed_days,
                COUNT(CASE WHEN a.clock_out IS NULL THEN 1 END) as active_count
            FROM attendances a
            JOIN users u ON a.user_id = u.id
            WHERE a.site_id = :siteId
            GROUP BY u.id, u.first_name, u.last_name, u.username, u.hourly_cost
            ORDER BY completed_hours DESC
        `, {
            replacements: { siteId },
            type: sequelize.QueryTypes.SELECT
        });

        // Get active attendances separately with their clockIn times
        const activeAttendancesPerEmployee = await Attendance.findAll({
            where: {
                siteId,
                clockOut: null
            },
            attributes: ['userId', 'clockIn', 'createdAt'],
            raw: true
        });

        // Create a map of userId to their active clockIn times
        const activeClockInsMap = {};
        activeAttendancesPerEmployee.forEach(att => {
            if (!activeClockInsMap[att.userId]) {
                activeClockInsMap[att.userId] = [];
            }
            activeClockInsMap[att.userId].push(att.clockIn?.time || att.createdAt);
        });

        // Calculate employee hours including live hours for active attendances
        const employeeHours = employeeHoursData.map(d => {
            let liveHoursForEmployee = 0;
            const isActive = parseInt(d.active_count) > 0;

            // Calculate live hours from active attendances
            const activeClockIns = activeClockInsMap[d.user_id] || [];
            activeClockIns.forEach(clockInTime => {
                if (clockInTime) {
                    const clockIn = new Date(clockInTime);
                    const diffMs = now - clockIn;
                    if (diffMs > 0) {
                        liveHoursForEmployee += diffMs / 3600000;
                    }
                }
            });

            return {
                id: {
                    id: d.user_id,
                    firstName: d.first_name,
                    lastName: d.last_name,
                    username: d.username,
                    hourlyCost: parseFloat(d.hourly_cost) || 0
                },
                totalHours: parseFloat(d.completed_hours || 0) + liveHoursForEmployee,
                totalDays: parseInt(d.completed_days || 0) + (isActive ? 1 : 0),
                isActive: isActive
            };
        });

        res.json({
            // Parse numeric fields from raw SQL results
            materials: materials.map(m => ({
                id: m.id,
                name: m.name || 'Materiale sconosciuto',
                unit: m.unit || 'pz',
                unitPrice: parseFloat(m.unitPrice) || 0,
                totalQuantity: parseFloat(m.totalQuantity) || 0,
                totalCost: parseFloat(m.totalCost) || 0
            })),
            equipment: equipment.map(e => ({
                ...e,
                totalQuantity: parseFloat(e.totalQuantity) || 0,
                count: parseInt(e.count) || 0
            })),
            attendance: completedAttendance[0] || { totalHours: 0, totalDays: 0 },
            totalHours,
            liveHours: parseFloat(liveHours.toFixed(2)),
            activeWorkers: inProgressAttendances.length, // Number of workers currently on site
            hasLiveData: inProgressAttendances.length > 0,
            contractValue: contractValue || null,
            status: site?.status || 'active', // 'active' or 'completed'
            siteCost: {
                total: parseFloat(totalCost.toFixed(2)),
                labor: parseFloat(laborCost.toFixed(2)),
                materials: parseFloat(materialsCost.toFixed(2))
            },
            margin: contractValue ? {
                marginCurrentValue: parseFloat(marginCurrentValue.toFixed(2)),
                marginCurrentPercent: parseFloat(marginCurrentPercent.toFixed(2)),
                costVsRevenuePercent: parseFloat(costVsRevenuePercent.toFixed(2))
            } : null,
            costIncidence: {
                materialsIncidencePercent: parseFloat(materialsIncidencePercent.toFixed(2)),
                laborIncidencePercent: parseFloat(laborIncidencePercent.toFixed(2)),
                totalCost: parseFloat(totalCost.toFixed(2)),
                laborCost: parseFloat(laborCost.toFixed(2)),
                materialsCost: parseFloat(materialsCost.toFixed(2))
            },
            dailyReports: dailyReports.map(r => ({
                id: r.id,
                date: r.date,
                activityType: r.activityType,
                description: r.description,
                hours: parseFloat(r.hours) || 0,
                notes: r.notes,
                createdAt: r.createdAt,
                user: r.user ? {
                    firstName: r.user.firstName,
                    lastName: r.user.lastName
                } : null
            })),
            employeeHours,
            // Explicit counts for frontend
            totalAttendances: employeeHours.reduce((sum, e) => sum + (e.totalDays || 0), 0),
            uniqueWorkers: employeeHours.length,
            // Margin info with semaphore status for analytics cards
            ...getSiteMarginInfo({ contractValue, totalCost })
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
        const companyId = getCompanyId(req);

        // Get all sites for this company
        const sites = await ConstructionSite.findAll({
            where: { companyId }
        });

        const totalSites = sites.length;
        const activeSites = sites.filter(s => s.status === 'active').length;

        // Get total employees
        const totalEmployees = await User.count({
            where: { companyId, role: 'worker', active: true }
        });

        // Get monthly hours (current month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyAttendances = await Attendance.findAll({
            where: {
                clockOut: { [Op.ne]: null },
                clockIn: { [Op.gte]: startOfMonth }
            },
            include: [{
                model: User,
                as: 'user',
                where: { companyId }
            }]
        });

        const monthlyHours = monthlyAttendances.reduce((sum, a) => sum + (parseFloat(a.totalHours) || 0), 0);

        // Calculate company-wide costs
        let laborCost = 0;
        let materialsCost = 0;

        // Get all attendances for company
        const allAttendances = await Attendance.findAll({
            where: { clockOut: { [Op.ne]: null } },
            include: [{
                model: User,
                as: 'user',
                where: { companyId },
                attributes: ['hourlyCost']
            }]
        });

        allAttendances.forEach(a => {
            const hours = parseFloat(a.totalHours) || 0;
            const hourlyCost = parseFloat(a.user?.hourlyCost) || 25; // default €25/h
            laborCost += hours * hourlyCost;
        });

        // Get materials cost from material_usages (linked to material_masters)
        const materialsCostResult = await sequelize.query(`
            SELECT 
                SUM(mu.numero_confezioni * COALESCE(mm.price, 0)) as total_cost
            FROM material_usages mu
            JOIN material_masters mm ON mu.material_id = mm.id
            WHERE mm.company_id = :companyId
              AND mu.stato = 'catalogato'
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        materialsCost = parseFloat(materialsCostResult[0]?.total_cost || 0);

        const totalCost = laborCost + materialsCost;

        // Calculate cost incidence percentages
        const materialsIncidencePercent = totalCost > 0 ? (materialsCost / totalCost) * 100 : 0;
        const laborIncidencePercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;

        // Calculate company margin
        const totalContractValue = sites.reduce((sum, s) => sum + (parseFloat(s.contractValue) || 0), 0);
        const sitesWithContractValue = sites.filter(s => parseFloat(s.contractValue) > 0).length;
        const marginValue = totalContractValue - totalCost;
        const costVsRevenuePercent = totalContractValue > 0 ? (totalCost / totalContractValue) * 100 : 0;

        res.json({
            message: 'Dashboard analytics',
            activeSites,
            totalEmployees,
            monthlyHours: parseFloat(monthlyHours.toFixed(2)),
            stats: {
                totalSites,
                activeSites,
                totalWorkers: totalEmployees,
                monthlyHours: parseFloat(monthlyHours.toFixed(2))
            },
            companyCosts: {
                total: parseFloat(totalCost.toFixed(2)),
                labor: parseFloat(laborCost.toFixed(2)),
                materials: parseFloat(materialsCost.toFixed(2))
            },
            companyCostIncidence: {
                materialsIncidencePercent: parseFloat(materialsIncidencePercent.toFixed(2)),
                laborIncidencePercent: parseFloat(laborIncidencePercent.toFixed(2)),
                totalCost: parseFloat(totalCost.toFixed(2)),
                laborCost: parseFloat(laborCost.toFixed(2)),
                materialsCost: parseFloat(materialsCost.toFixed(2))
            },
            companyMargin: {
                totalContractValue: parseFloat(totalContractValue.toFixed(2)),
                totalSites,
                sitesWithContractValue,
                marginValue: parseFloat(marginValue.toFixed(2)),
                costVsRevenuePercent: parseFloat(costVsRevenuePercent.toFixed(2))
            }
        });
    } catch (error) {
        console.error('getDashboard error:', error);
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
