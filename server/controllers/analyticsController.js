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
        const result = await User.populate(hoursData, { path: '_id', select: 'firstName lastName username' });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'analisi delle ore', error: error.message });
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
                    totalQuantity: { $sum: '$numeroConfezioni' }, // Note: This is packs, not base unit. 
                    // Ideally we should multiply by pack size if available, but for now we sum packs/units as recorded
                    unit: { $first: '$materialDetails.unit' }, // Use unit from catalog
                    count: { $sum: 1 }
                }
            }
        ]);

        // 3. Merge lists
        // We use a map to combine if same name exists (unlikely but possible)
        const materialMap = new Map();

        // Add manual
        manualMaterials.forEach(m => {
            materialMap.set(m._id, {
                _id: m._id,
                totalQuantity: m.totalQuantity,
                unit: m.unit,
                count: m.count,
                source: 'manual'
            });
        });

        // Add/Merge catalog
        catalogMaterials.forEach(m => {
            if (materialMap.has(m._id)) {
                const existing = materialMap.get(m._id);
                existing.totalQuantity += m.totalQuantity;
                existing.count += m.count;
                // Keep existing unit
            } else {
                materialMap.set(m._id, {
                    _id: m._id,
                    totalQuantity: m.totalQuantity,
                    unit: m.unit || 'pz',
                    count: m.count,
                    source: 'catalog'
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

        // Total hours on site
        const hours = await Attendance.aggregate([
            { $match: { site: siteObjectId, clockOut: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalHours: { $sum: '$totalHours' }
                }
            }
        ]);

        res.json({
            materials: allMaterials,
            equipment,
            totalHours: hours[0]?.totalHours || 0
        });
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

        res.json({
            activeSites,
            totalEmployees,
            monthlyHours: monthHours[0]?.totalHours || 0
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
