const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Material = require('../models/Material');
const Equipment = require('../models/Equipment');
const User = require('../models/User');

// @desc    Get hours per employee
// @route   GET /api/analytics/hours-per-employee
// @access  Private (Owner)
const getHoursPerEmployee = async (req, res) => {
    try {
        const { startDate, endDate, siteId } = req.query;
        console.log('DEBUG: getHoursPerEmployee called with:', { startDate, endDate, siteId });

        // Get all company employees
        const companyId = req.user.company._id || req.user.company;
        const employees = await User.find({ company: companyId });
        const employeeIds = employees.map(e => e._id);

        const matchQuery = {
            user: { $in: employeeIds },
            clockOut: { $exists: true }
        };

        if (siteId) {
            matchQuery.site = new mongoose.Types.ObjectId(siteId);
        }

        if (startDate && endDate) {
            matchQuery['clockIn.time'] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const hoursData = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$user',
                    totalHours: { $sum: '$totalHours' },
                    totalDays: { $sum: 1 }
                }
            },
            { $sort: { totalHours: -1 } }
        ]);

        console.log('DEBUG: hoursData found:', hoursData.length, 'records');
        console.log('DEBUG: matchQuery used:', JSON.stringify(matchQuery));

        // Populate user info
        const result = await User.populate(hoursData, { path: '_id', select: 'firstName lastName username hourlyCost' });

        res.json(result);
    } catch (error) {
        console.error('ERROR in getHoursPerEmployee:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: 'Error loading employee hours', error: error.message });
    }
};

// @desc    Get site report
// @route   GET /api/analytics/site-report/:siteId
// @access  Private (Owner)
const getSiteReport = async (req, res) => {
    try {
        const { siteId } = req.params;
        const siteObjectId = new mongoose.Types.ObjectId(siteId);

        // 1. Manual Materials (from 'materials' collection)
        const manualMaterials = await Material.aggregate([
            { $match: { site: siteObjectId } },
            {
                $group: {
                    _id: '$name',
                    totalQuantity: { $sum: '$quantity' },
                    unit: { $first: '$unit' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 2. Catalog Materials (from 'materialusages' collection)
        const MaterialUsage = require('../models/MaterialUsage');
        const catalogMaterials = await MaterialUsage.aggregate([
            {
                $match: {
                    site: siteObjectId,
                    material: { $ne: null } // Only linked materials
                }
            },
            {
                $lookup: {
                    from: 'colouramaterials',
                    localField: 'material',
                    foreignField: '_id',
                    as: 'materialDetails'
                }
            },
            { $unwind: '$materialDetails' },
            {
                $group: {
                    _id: '$materialDetails.nome_prodotto',
                    totalQuantity: { $sum: '$numeroConfezioni' },
                    unit: { $first: '$materialDetails.unit' },
                    totalCost: { $sum: { $multiply: ['$numeroConfezioni', { $ifNull: ['$materialDetails.prezzo', 0] }] } },
                    unitPrice: { $first: '$materialDetails.prezzo' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 3. Merge lists
        const materialMap = new Map();
        let totalMaterialCost = 0;

        // Add manual
        manualMaterials.forEach(m => {
            materialMap.set(m._id, {
                _id: m._id,
                totalQuantity: m.totalQuantity,
                unit: m.unit,
                count: m.count,
                source: 'manual',
                totalCost: 0 // Manual materials have 0 cost for now
            });
        });

        // Add/Merge catalog
        catalogMaterials.forEach(m => {
            totalMaterialCost += m.totalCost || 0;
            if (materialMap.has(m._id)) {
                const existing = materialMap.get(m._id);
                existing.totalQuantity += m.totalQuantity;
                existing.count += m.count;
                existing.totalCost = (existing.totalCost || 0) + (m.totalCost || 0);
            } else {
                materialMap.set(m._id, {
                    _id: m._id,
                    totalQuantity: m.totalQuantity,
                    unit: m.unit || 'pz',
                    count: m.count,
                    source: 'catalog',
                    totalCost: m.totalCost || 0
                });
            }
        });

        const allMaterials = Array.from(materialMap.values());

        // Equipment used
        const equipment = await Equipment.aggregate([
            { $match: { site: siteObjectId } },
            {
                $group: {
                    _id: '$name',
                    totalQuantity: { $sum: '$quantity' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Total hours
        const totalHours = await Attendance.aggregate([
            { $match: { site: siteObjectId, clockOut: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalHours: { $sum: '$totalHours' }
                }
            }
        ]);

        // Hours per employee
        const employeeHours = await Attendance.aggregate([
            { $match: { site: siteObjectId, clockOut: { $exists: true } } },
            {
                $group: {
                    _id: '$user',
                    totalHours: { $sum: '$totalHours' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: { _id: '$userInfo._id', firstName: '$userInfo.firstName', lastName: '$userInfo.lastName' },
                    totalHours: 1
                }
            }
        ]);

        // === SITE COST CALCULATION ===
        // Fetch all attendance records with user information for labor cost
        const attendanceWithUsers = await Attendance.find({
            site: siteObjectId,
            clockOut: { $exists: true }
        }).populate('user', 'hourlyCost'); // Only fetch hourlyCost field

        // Calculate labor cost
        let laborCost = 0;
        attendanceWithUsers.forEach(attendance => {
            if (attendance.totalHours && attendance.user && attendance.user.hourlyCost) {
                laborCost += attendance.totalHours * attendance.user.hourlyCost;
            }
        });

        // Material cost is already calculated in totalMaterialCost
        const materialCost = totalMaterialCost;

        // Total site cost
        const siteCost = materialCost + laborCost;

        console.log('✅ Site Costs:', {
            siteId,
            materialCost: materialCost.toFixed(2),
            laborCost: laborCost.toFixed(2),
            total: siteCost.toFixed(2)
        });

        // 4. Daily Reports (WorkActivity)
        const WorkActivity = require('../models/WorkActivity');
        const dailyReports = await WorkActivity.find({
            site: siteObjectId
            // Removed unit: 'report' filter to show all activities/reports
        })
            .populate('user', 'firstName lastName username')
            .sort({ date: -1 });

        const responseData = {
            materials: allMaterials,
            equipment,
            totalHours: totalHours[0]?.totalHours || 0,
            employeeHours,
            dailyReports, // Added daily reports
            siteCost: {
                materials: Math.round(materialCost * 100) / 100,
                labor: Math.round(laborCost * 100) / 100,
                total: Math.round(siteCost * 100) / 100
            }
        };

        console.log('✅ Sending response for site report');
        res.json(responseData);
    } catch (error) {
        console.error('Site Report Error:', error);
        res.status(500).json({ message: 'Errore nel report del cantiere', error: error.message });
    }
};

// @desc    Get material usage per employee
// @route   GET /api/analytics/employee-materials/:employeeId
// @access  Private (Owner)
const getEmployeeMaterials = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const materials = await Material.aggregate([
            { $match: { user: employeeId } },
            {
                $group: {
                    _id: '$name',
                    totalQuantity: { $sum: '$quantity' },
                    unit: { $first: '$unit' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'analisi dei materiali', error: error.message });
    }
};

// @desc    Get dashboard data
// @route   GET /api/analytics/dashboard
// @access  Private (Owner)
const getDashboard = async (req, res) => {
    try {
        const companyId = req.user.company._id || req.user.company;
        const companyUsers = await User.find({ company: companyId });
        const userIds = companyUsers.map(u => u._id);

        // Total active sites
        const ConstructionSite = require('../models/ConstructionSite');
        const activeSites = await ConstructionSite.countDocuments({
            company: companyId,
            status: { $in: ['active', 'planned'] }
        });

        // Total employees
        const totalEmployees = companyUsers.length;

        // This month's hours
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthHours = await Attendance.aggregate([
            {
                $match: {
                    user: { $in: userIds },
                    'clockIn.time': { $gte: startOfMonth },
                    clockOut: { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalHours: { $sum: '$totalHours' }
                }
            }
        ]);

        // === COMPANY-WIDE COST CALCULATION ===
        // Get all company sites
        const companySites = await ConstructionSite.find({ company: companyId });
        const siteIds = companySites.map(s => s._id);

        // Calculate total labor cost across all sites
        const allAttendances = await Attendance.find({
            site: { $in: siteIds },
            clockOut: { $exists: true }
        }).populate('user', 'hourlyCost');

        let totalLaborCost = 0;
        allAttendances.forEach(attendance => {
            if (attendance.totalHours && attendance.user && attendance.user.hourlyCost) {
                totalLaborCost += attendance.totalHours * attendance.user.hourlyCost;
            }
        });

        // Calculate total material cost across all sites
        const MaterialUsage = require('../models/MaterialUsage');
        const allMaterialUsages = await MaterialUsage.aggregate([
            {
                $match: {
                    site: { $in: siteIds },
                    material: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'colouramaterials',
                    localField: 'material',
                    foreignField: '_id',
                    as: 'materialDetails'
                }
            },
            { $unwind: '$materialDetails' },
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: { $multiply: ['$numeroConfezioni', { $ifNull: ['$materialDetails.prezzo', 0] }] } }
                }
            }
        ]);

        const totalMaterialCost = allMaterialUsages[0]?.totalCost || 0;
        const totalCompanyCost = totalLaborCost + totalMaterialCost;

        console.log('✅ Company Total Costs:', {
            labor: totalLaborCost.toFixed(2),
            materials: totalMaterialCost.toFixed(2),
            total: totalCompanyCost.toFixed(2)
        });

        res.json({
            activeSites,
            totalEmployees,
            monthlyHours: monthHours[0]?.totalHours || 0,
            companyCosts: {
                total: Math.round(totalCompanyCost * 100) / 100,
                labor: Math.round(totalLaborCost * 100) / 100,
                materials: Math.round(totalMaterialCost * 100) / 100
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore nel caricamento della dashboard', error: error.message });
    }
};

module.exports = {
    getHoursPerEmployee,
    getSiteReport,
    getEmployeeMaterials,
    getDashboard
};
