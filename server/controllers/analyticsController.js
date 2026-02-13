const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Attendance, Material, Equipment, User, ConstructionSite, MaterialUsage, MaterialMaster, WorkActivity } = require('../models');
const { assertSiteBelongsToCompany } = require('../utils/security');
const { getCompanyId } = require('../utils/sequelizeHelpers');
const { getSiteMarginInfo } = require('../utils/marginCalculator');
const { generateHomeInsights } = require('../utils/insightGenerator');

// @desc    Get hours per employee
// @route   GET /api/analytics/hours-per-employee
// @access  Private (Owner)
const getHoursPerEmployee = async (req, res) => {
    try {
        const { startDate, endDate, siteId } = req.query;
        console.log('DEBUG: getHoursPerEmployee called with:', { startDate, endDate, siteId });

        const companyId = getCompanyId(req);

        // Get aggregated hours including active attendances
        const hoursData = await sequelize.query(`
            SELECT 
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.username,
                u.hourly_cost,
                u.first_name || ' ' || u.last_name as employee,
                COALESCE(SUM(CASE WHEN a.clock_out IS NOT NULL THEN a.total_hours ELSE 0 END), 0) as total_hours,
                COUNT(CASE WHEN a.clock_out IS NOT NULL THEN 1 END) as total_days,
                COUNT(CASE WHEN a.clock_out IS NULL THEN 1 END) as active_count
            FROM attendances a
            JOIN users u ON a.user_id = u.id
            WHERE u.company_id = :companyId
              ${siteId ? 'AND a.site_id = :siteId' : ''}
              ${startDate ? "AND (a.clock_in->>'time')::timestamp >= :startDate" : ''}
              ${endDate ? "AND (a.clock_in->>'time')::timestamp <= :endDate" : ''}
            GROUP BY u.id, u.first_name, u.last_name, u.username, u.hourly_cost
            ORDER BY total_hours DESC
        `, {
            replacements: { companyId, siteId, startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });

        console.log('DEBUG: hoursData found:', hoursData.length, 'records');

        // Get active attendances to calculate live hours
        const now = new Date();
        const activeAttendances = await Attendance.findAll({
            where: {
                clockOut: null,
                ...(siteId ? { siteId } : {})
            },
            include: [{
                model: User,
                as: 'user',
                where: { companyId },
                attributes: []
            }],
            attributes: ['userId', 'clockIn', 'createdAt'],
            raw: true
        });

        // Create a map of userId to their live hours
        const liveHoursMap = {};
        activeAttendances.forEach(att => {
            const clockInTime = att.clockIn?.time ? new Date(att.clockIn.time) : new Date(att.createdAt);
            const diffMs = now - clockInTime;
            if (diffMs > 0) {
                const hours = diffMs / 3600000;
                liveHoursMap[att.userId] = (liveHoursMap[att.userId] || 0) + hours;
            }
        });

        // Format response to match frontend expectations
        res.json(hoursData.map(d => ({
            id: {
                id: d.user_id,
                firstName: d.first_name,
                lastName: d.last_name,
                username: d.username,
                hourlyCost: Number.parseFloat(d.hourly_cost) || 0
            },
            employee: d.employee,
            totalHours: Number.parseFloat(d.total_hours || 0) + (liveHoursMap[d.user_id] || 0),
            totalDays: Number.parseInt(d.total_days || 0) + (Number.parseInt(d.active_count) > 0 ? 1 : 0),
            avgHoursPerDay: Number.parseFloat(d.total_hours || 0) > 0
                ? (Number.parseFloat(d.total_hours || 0) / Number.parseInt(d.total_days || 1)).toFixed(2)
                : '0.00',
            isActive: Number.parseInt(d.active_count) > 0
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
                COALESCE(mm.id, cm.id) as id,
                COALESCE(mm.display_name, cm.nome_prodotto, 'Materiale sconosciuto') as name,
                COALESCE(mm.unit, cm.quantita, 'pz') as unit,
                COALESCE(mm.price, cm.prezzo, 0) as "unitPrice",
                SUM(mu.numero_confezioni) as "totalQuantity",
                SUM(mu.numero_confezioni * COALESCE(mm.price, cm.prezzo, 0)) as "totalCost"
            FROM material_usages mu
            LEFT JOIN material_masters mm ON mu.material_id = mm.id
            LEFT JOIN coloura_materials cm ON mu.material_id = cm.id
            WHERE mu.site_id = :siteId
              AND mu.stato = 'catalogato'
            GROUP BY COALESCE(mm.id, cm.id), COALESCE(mm.display_name, cm.nome_prodotto), COALESCE(mm.unit, cm.quantita), COALESCE(mm.price, cm.prezzo)
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
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'hourlyCost']
            }],
            attributes: ['id', 'clockIn', 'createdAt', 'userId'],
            raw: true
        });

        // Calculate live hours for in-progress attendances
        let liveHours = 0;
        let liveLaborCost = 0;
        const now = new Date();
        inProgressAttendances.forEach(att => {
            const clockInTime = att.clockIn?.time ? new Date(att.clockIn.time) : new Date(att.createdAt);
            const diffMs = now - clockInTime;
            if (diffMs > 0) {
                const hours = diffMs / 3600000; // Convert to hours
                liveHours += hours;
                const hourlyCost = Number.parseFloat(att['user.hourlyCost']) || 0;
                liveLaborCost += hours * hourlyCost;
            }
        });

        // Calculate labor cost using individual hourly rates (completed attendances)
        // Uses attendance.hourly_cost if available (new records), falls back to user.hourly_cost (old records)
        const laborCostResult = await sequelize.query(`
            SELECT 
                SUM(a.total_hours * COALESCE(a.hourly_cost, u.hourly_cost, 0)) as total_labor_cost
            FROM attendances a
            JOIN users u ON a.user_id = u.id
            WHERE a.site_id = :siteId
              AND a.clock_out IS NOT NULL
        `, {
            replacements: { siteId },
            type: sequelize.QueryTypes.SELECT
        });

        const completedLaborCost = Number.parseFloat(laborCostResult[0]?.total_labor_cost || 0);
        const laborCost = completedLaborCost + liveLaborCost;

        // Calculate total hours (completed + live)
        const completedHours = Number.parseFloat(completedAttendance[0]?.totalHours || 0);
        const totalHours = completedHours + liveHours;

        // Calculate materials cost from material_usages
        const materialUsages = await sequelize.query(`
            SELECT 
                SUM(mu.numero_confezioni * COALESCE(mm.price, cm.prezzo, 0)) as total_cost
            FROM material_usages mu
            LEFT JOIN material_masters mm ON mu.material_id = mm.id
            LEFT JOIN coloura_materials cm ON mu.material_id = cm.id
            WHERE mu.site_id = :siteId
              AND mu.stato = 'catalogato'
        `, {
            replacements: { siteId },
            type: sequelize.QueryTypes.SELECT
        });

        const materialsCost = Number.parseFloat(materialUsages[0]?.total_cost || 0);
        const totalCost = laborCost + materialsCost;

        // Calculate percentages (avoid division by zero)
        const materialsIncidencePercent = totalCost > 0 ? (materialsCost / totalCost) * 100 : 0;
        const laborIncidencePercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;

        // Get contractValue and calculate margin
        // DEBUG: Log the raw contractValue from database
        console.log('[Analytics] Raw contractValue from DB:', site?.contractValue, 'Type:', typeof site?.contractValue);
        const contractValue = Number.parseFloat(site?.contractValue) || 0;
        console.log('[Analytics] Parsed contractValue:', contractValue);
        const marginCurrentValue = contractValue - totalCost;
        const marginCurrentPercent = contractValue > 0 ? (marginCurrentValue / contractValue) * 100 : 0;
        const costVsRevenuePercent = contractValue > 0 ? (totalCost / contractValue) * 100 : 0;

        // Get daily reports from WorkActivity (work activities submitted by workers)
        const dailyReports = await WorkActivity.findAll({
            where: { siteId },
            include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'username'] }],
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
        const activeAttendances = await Attendance.findAll({
            where: {
                'siteId': siteId,
                'clockOut': null
            },
            include: [{ model: User, as: 'user', attributes: ['id', 'hourlyCost'] }],
            attributes: ['id', 'clockIn', 'createdAt', 'userId'],
            raw: true
        });

        // Create a map of userId to their active clockIn times
        const activeClockInsMap = {};
        activeAttendances.forEach(att => {
            if (!activeClockInsMap[att.userId]) {
                activeClockInsMap[att.userId] = [];
            }
            activeClockInsMap[att.userId].push(att.clockIn?.time || att.createdAt);
        });

        // Calculate employee hours including live hours for active attendances
        const employeeHours = employeeHoursData.map(d => {
            let liveHoursForEmployee = 0;
            const isActive = Number.parseInt(d.active_count) > 0;

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
                    hourlyCost: Number.parseFloat(d.hourly_cost) || 0
                },
                totalHours: Number.parseFloat(d.completed_hours || 0) + liveHoursForEmployee,
                totalDays: Number.parseInt(d.completed_days || 0) + (isActive ? 1 : 0),
                isActive: isActive
            };
        });

        res.json({
            // Parse numeric fields from raw SQL results
            materials: materials.map(m => ({
                id: m.id,
                name: m.name || 'Materiale sconosciuto',
                unit: m.unit || 'pz',
                unitPrice: Number.parseFloat(m.unitPrice) || 0,
                totalQuantity: Number.parseFloat(m.totalQuantity) || 0,
                totalCost: Number.parseFloat(m.totalCost) || 0
            })),
            equipment: equipment.map(e => ({
                ...e,
                totalQuantity: Number.parseFloat(e.totalQuantity) || 0,
                count: Number.parseInt(e.count) || 0
            })),
            attendance: completedAttendance[0] || { totalHours: 0, totalDays: 0 },
            totalHours,
            liveHours: Number.parseFloat(liveHours.toFixed(2)),
            activeWorkers: inProgressAttendances.length, // Number of workers currently on site
            hasLiveData: inProgressAttendances.length > 0,
            contractValue: contractValue || null,
            status: site?.status || 'active', // 'active' or 'completed'
            siteCost: {
                total: Number.parseFloat(totalCost.toFixed(2)),
                labor: Number.parseFloat(laborCost.toFixed(2)),
                materials: Number.parseFloat(materialsCost.toFixed(2))
            },
            margin: contractValue ? {
                marginCurrentValue: Number.parseFloat(marginCurrentValue.toFixed(2)),
                marginCurrentPercent: Number.parseFloat(marginCurrentPercent.toFixed(2)),
                costVsRevenuePercent: Number.parseFloat(costVsRevenuePercent.toFixed(2))
            } : null,
            costIncidence: {
                materialsIncidencePercent: Number.parseFloat(materialsIncidencePercent.toFixed(2)),
                laborIncidencePercent: Number.parseFloat(laborIncidencePercent.toFixed(2)),
                totalCost: Number.parseFloat(totalCost.toFixed(2)),
                laborCost: Number.parseFloat(laborCost.toFixed(2)),
                materialsCost: Number.parseFloat(materialsCost.toFixed(2))
            },
            dailyReports: dailyReports.map(r => ({
                id: r.id,
                date: r.date,
                activityType: r.activityType,
                description: r.description,
                hours: Number.parseFloat(r.hours) || 0,
                notes: r.notes,
                createdAt: r.createdAt,
                user: r.user ? {
                    firstName: r.user.firstName,
                    lastName: r.user.lastName,
                    username: r.user.username
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
                'clockIn.time': { [Op.gte]: startOfMonth }
            },
            include: [{
                model: User,
                as: 'user',
                where: { companyId }
            }]
        });

        const monthlyHours = monthlyAttendances.reduce((sum, a) => sum + (Number.parseFloat(a.totalHours) || 0), 0);

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
            const hours = Number.parseFloat(a.totalHours) || 0;
            const hourlyCost = Number.parseFloat(a.user?.hourlyCost) || 25; // default €25/h
            laborCost += hours * hourlyCost;
        });

        // Get materials cost from material_usages (linked to material_masters)
        const materialsCostResult = await sequelize.query(`
            SELECT 
                SUM(mu.numero_confezioni * COALESCE(mm.price, cm.prezzo, 0)) as total_cost
            FROM material_usages mu
            LEFT JOIN material_masters mm ON mu.material_id = mm.id
            LEFT JOIN coloura_materials cm ON mu.material_id = cm.id
            WHERE mu.company_id = :companyId
              AND mu.stato = 'catalogato'
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });


        materialsCost = Number.parseFloat(materialsCostResult[0]?.total_cost || 0);

        const totalCost = laborCost + materialsCost;

        // Calculate cost incidence percentages
        const materialsIncidencePercent = totalCost > 0 ? (materialsCost / totalCost) * 100 : 0;
        const laborIncidencePercent = totalCost > 0 ? (laborCost / totalCost) * 100 : 0;

        // Calculate company margin
        const totalContractValue = sites.reduce((sum, s) => sum + (Number.parseFloat(s.contractValue) || 0), 0);
        const sitesWithContractValue = sites.filter(s => Number.parseFloat(s.contractValue) > 0).length;
        const marginValue = totalContractValue - totalCost;
        const costVsRevenuePercent = totalContractValue > 0 ? (totalCost / totalContractValue) * 100 : 0;

        // Calculate margin growth as a percentage of contract value
        const marginGrowthPercent = totalContractValue > 0
            ? (marginValue / totalContractValue) * 100
            : 0;

        // Generate rule-based insights for the Home dashboard
        const homeInsights = generateHomeInsights({
            marginGrowthPercent,
            marginPercent: marginGrowthPercent,
            laborPercent: laborIncidencePercent,
            materialsPercent: materialsIncidencePercent,
            monthlyHours,
            totalWorkers: totalEmployees,
            activeSites,
            totalSites,
            sitesWithMargin: sitesWithContractValue
        });

        res.json({
            message: 'Dashboard analytics',
            activeSites,
            totalEmployees,
            monthlyHours: Number.parseFloat(monthlyHours.toFixed(2)),
            stats: {
                totalSites,
                activeSites,
                totalWorkers: totalEmployees,
                monthlyHours: Number.parseFloat(monthlyHours.toFixed(2))
            },
            companyCosts: {
                total: Number.parseFloat(totalCost.toFixed(2)),
                labor: Number.parseFloat(laborCost.toFixed(2)),
                materials: Number.parseFloat(materialsCost.toFixed(2))
            },
            companyCostIncidence: {
                materialsIncidencePercent: Number.parseFloat(materialsIncidencePercent.toFixed(2)),
                laborIncidencePercent: Number.parseFloat(laborIncidencePercent.toFixed(2)),
                totalCost: Number.parseFloat(totalCost.toFixed(2)),
                laborCost: Number.parseFloat(laborCost.toFixed(2)),
                materialsCost: Number.parseFloat(materialsCost.toFixed(2))
            },
            companyMargin: {
                totalContractValue: Number.parseFloat(totalContractValue.toFixed(2)),
                totalSites,
                sitesWithContractValue,
                marginValue: Number.parseFloat(marginValue.toFixed(2)),
                marginGrowthPercent: Number.parseFloat(marginGrowthPercent.toFixed(2)),
                costVsRevenuePercent: Number.parseFloat(costVsRevenuePercent.toFixed(2))
            },
            homeInsights
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
