const mongoose = require('mongoose');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const MaterialUsage = require('../models/MaterialUsage');
const ColouraMaterial = require('../models/ColouraMaterial');
const ReportedMaterial = require('../models/ReportedMaterial');

// Record material usage (catalogato flow)
const recordUsage = async (req, res) => {
    try {
        const { siteId, materialId, numeroConfezioni, note } = req.body;

        console.log('Record Usage Request:', {
            siteId,
            materialId,
            numeroConfezioni,
            userId: getUserId(req)
        });

        if (!siteId || !materialId || !numeroConfezioni) {
            return res.status(400).json({ message: 'Cantiere, materiale e quantità sono obbligatori' });
        }

        // Safe company ID access
        const companyId = req.user.company?._id || req.user.company;
        if (!companyId) {
            console.error('User has no company assigned:', getUserId(req));
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        // Verify material exists and is active
        const material = await ColouraMaterial.findOne({
            _id: materialId,
            company: companyId,
            attivo: true
        });

        if (!material) {
            console.warn(`Material not found or inactive. ID: ${materialId}, Company: ${companyId}`);
            return res.status(404).json({ message: 'Materiale non trovato o non attivo' });
        }

        const usage = await MaterialUsage.create({
            company: companyId,
            site: siteId,
            material: materialId,
            user: getUserId(req),
            numeroConfezioni,
            stato: 'catalogato',
            note: note || ''
        });

        const populatedUsage = await MaterialUsage.findById(usage._id)
            .populate('material')
            .populate('user', 'firstName lastName')
            .populate('site', 'name');

        res.status(201).json(populatedUsage);
    } catch (error) {
        console.error('Record Usage Error:', error);
        res.status(500).json({ message: 'Errore nella registrazione dell\'uso', error: error.message });
    }
};

// Get today's material usage for worker
const getTodayUsage = async (req, res) => {
    try {
        const { siteId } = req.query;

        // Safe company ID access
        const companyId = req.user.company?._id || req.user.company;
        if (!companyId) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const query = {
            company: companyId,
            user: getUserId(req),
            dataOra: {
                $gte: today,
                $lt: tomorrow
            }
        };

        if (siteId) {
            query.site = siteId;
        }

        const usages = await MaterialUsage.find(query)
            .populate('material')
            .populate('site', 'name')
            .populate('materialeReportId')
            .sort({ dataOra: -1 });

        res.json(usages);
    } catch (error) {
        console.error('Get Today Usage Error:', error);
        res.status(500).json({ message: 'Errore nel recupero materiali oggi', error: error.message });
    }
};

// Get most used materials for a specific site
const getMostUsedBySite = async (req, res) => {
    try {
        const { siteId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        if (!siteId) {
            return res.status(400).json({ message: 'ID cantiere richiesto' });
        }

        // Aggregate to find most used materials
        const mostUsed = await MaterialUsage.aggregate([
            {
                $match: {
                    company: getCompanyId(req),
                    site: mongoose.Types.ObjectId(siteId),
                    material: { $ne: null },  // Only catalogued materials
                    stato: 'catalogato'
                }
            },
            {
                $group: {
                    _id: '$material',
                    totalConfezioni: { $sum: '$numeroConfezioni' },
                    usageCount: { $sum: 1 }
                }
            },
            {
                $sort: { totalConfezioni: -1 }
            },
            {
                $limit: limit
            }
        ]);

        // Populate material details
        const materialIds = mostUsed.map(m => m._id);
        const materials = await ColouraMaterial.find({
            _id: { $in: materialIds },
            attivo: true
        });

        // Combine results
        const result = mostUsed.map(usage => {
            const material = materials.find(m => m._id.toString() === usage._id.toString());
            return {
                material,
                totalConfezioni: usage.totalConfezioni,
                usageCount: usage.usageCount
            };
        }).filter(item => item.material);

        res.json(result);
    } catch (error) {
        console.error('Get Most Used Error:', error);
        res.status(500).json({ message: 'Errore nel recupero materiali più usati', error: error.message });
    }
};

// Get usage history
const getUsageHistory = async (req, res) => {
    try {
        const { siteId, startDate, endDate, materialId } = req.query;
        const query = { company: getCompanyId(req) };

        if (siteId) query.site = siteId;
        if (materialId) query.material = materialId;

        if (startDate || endDate) {
            query.dataOra = {};
            if (startDate) query.dataOra.$gte = new Date(startDate);
            if (endDate) query.dataOra.$lte = new Date(endDate);
        }

        const usages = await MaterialUsage.find(query)
            .populate('material')
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .populate('materialeReportId')
            .sort({ dataOra: -1 })
            .limit(100);

        res.json(usages);
    } catch (error) {
        console.error('Get Usage History Error:', error);
        res.status(500).json({ message: 'Errore nel recupero dello storico', error: error.message });
    }
};

// Delete material usage
const deleteUsage = async (req, res) => {
    try {
        const { id } = req.params;

        // Safe company ID access
        const companyId = req.user.company?._id || req.user.company;
        if (!companyId) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const usage = await MaterialUsage.findOne({
            _id: id,
            company: companyId
        });

        if (!usage) {
            return res.status(404).json({ message: 'Utilizzo materiale non trovato' });
        }

        // Optional: Check if user is the one who created it or is admin
        // For now, allow if same company (or restrict to creator if needed)
        if (usage.user.toString() !== getUserId(req).toString() && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Non autorizzato a eliminare questo record' });
        }

        await usage.deleteOne();

        res.json({ message: 'Utilizzo materiale eliminato' });
    } catch (error) {
        console.error('Delete Usage Error:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione', error: error.message });
    }
};

module.exports = {
    recordUsage,
    getTodayUsage,
    getMostUsedBySite,
    getUsageHistory,
    deleteUsage
};
