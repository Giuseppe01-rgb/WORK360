const { MaterialUsage, MaterialMaster, User, ConstructionSite } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Record material usage (catalogato flow)
const recordUsage = async (req, res) => {
    try {
        const { siteId, materialId, numeroConfezioni, note } = req.body;

        console.log('Record Usage Request:', {
            siteId,
            materialId,
            numeroConfezioni,
            userId: getUserId(req),
            body: req.body
        });

        if (!siteId || !materialId || !numeroConfezioni) {
            console.error('Validation failed - missing fields:', { siteId: !!siteId, materialId: !!materialId, numeroConfezioni: !!numeroConfezioni });
            return res.status(400).json({
                message: 'Cantiere, materiale e quantità sono obbligatori',
                details: { siteId: !!siteId, materialId: !!materialId, numeroConfezioni: !!numeroConfezioni }
            });
        }

        const companyId = getCompanyId(req);
        console.log('Company ID resolved:', companyId);
        if (!companyId) {
            console.error('User has no company assigned:', getUserId(req), 'User object:', req.user);
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        // Verify material exists in MaterialMaster (catalog)
        const material = await MaterialMaster.findOne({
            where: {
                id: materialId,
                companyId
            }
        });

        if (!material) {
            console.warn(`Material not found. ID: ${materialId}, Company: ${companyId}`);
            return res.status(404).json({ message: 'Materiale non trovato nel catalogo' });
        }

        const usage = await MaterialUsage.create({
            companyId,
            siteId,
            materialId,
            userId: getUserId(req),
            numeroConfezioni,
            stato: 'catalogato',
            note: note || ''
        });

        // Reload with associations - use MaterialMaster
        const populatedUsage = await MaterialUsage.findByPk(usage.id, {
            include: [
                { model: MaterialMaster, as: 'materialMaster' },
                { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ]
        });

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

        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const whereClause = {
            companyId,
            userId: getUserId(req),
            dataOra: {
                [Op.gte]: today,
                [Op.lt]: tomorrow
            }
        };

        if (siteId) {
            whereClause.siteId = siteId;
        }

        const usages = await MaterialUsage.findAll({
            where: whereClause,
            include: [
                { model: MaterialMaster, as: 'materialMaster' },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ],
            order: [['dataOra', 'DESC']]
        });

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
        const limit = Number.parseInt(req.query.limit) || 5;

        if (!siteId) {
            return res.status(400).json({ message: 'ID cantiere richiesto' });
        }

        // Use raw SQL query for aggregation
        const results = await sequelize.query(`
            SELECT 
                material_id,
                SUM(numero_confezioni) as total_confezioni,
                COUNT(*) as usage_count
            FROM material_usages
            WHERE company_id = :companyId
                AND site_id = :siteId
                AND material_id IS NOT NULL
                AND stato = 'catalogato'
            GROUP BY material_id
            ORDER BY total_confezioni DESC
            LIMIT :limit
        `, {
            replacements: {
                companyId: getCompanyId(req),
                siteId,
                limit
            },
            type: sequelize.QueryTypes.SELECT
        });

        // Get material details for the IDs from MaterialMaster
        const materialIds = results.map(r => r.material_id);
        const materials = await MaterialMaster.findAll({
            where: {
                id: { [Op.in]: materialIds }
            }
        });

        // Combine results
        const result = results.map(usage => {
            const material = materials.find(m => m.id === usage.material_id);
            return {
                material,
                totalConfezioni: Number.parseInt(usage.total_confezioni),
                usageCount: Number.parseInt(usage.usage_count)
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
        const whereClause = { companyId: getCompanyId(req) };

        if (siteId) whereClause.siteId = siteId;
        if (materialId) whereClause.materialId = materialId;

        if (startDate || endDate) {
            whereClause.dataOra = {};
            if (startDate) whereClause.dataOra[Op.gte] = new Date(startDate);
            if (endDate) whereClause.dataOra[Op.lte] = new Date(endDate);
        }

        const usages = await MaterialUsage.findAll({
            where: whereClause,
            include: [
                { model: MaterialMaster, as: 'materialMaster' },
                { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ],
            order: [['dataOra', 'DESC']],
            limit: 100
        });

        res.json(usages);
    } catch (error) {
        console.error('Get Usage History Error:', error);
        res.status(500).json({ message: 'Errore nel recupero dello storico', error: error.message });
    }
};

// Update material usage
const updateUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialId, numeroConfezioni, note } = req.body;

        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const usage = await MaterialUsage.findOne({
            where: {
                id,
                companyId
            }
        });

        if (!usage) {
            return res.status(404).json({ message: 'Utilizzo materiale non trovato' });
        }

        // Check authorization - only owner can edit any, workers can only edit their own
        if (usage.userId !== getUserId(req) && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Non autorizzato a modificare questo record' });
        }

        // Build update object
        const updateData = {};
        if (materialId !== undefined) {
            // Verify new material exists
            const material = await MaterialMaster.findOne({
                where: { id: materialId, companyId }
            });
            if (!material) {
                return res.status(404).json({ message: 'Materiale non trovato nel catalogo' });
            }
            updateData.materialId = materialId;
        }
        if (numeroConfezioni !== undefined) updateData.numeroConfezioni = numeroConfezioni;
        if (note !== undefined) updateData.note = note;

        await usage.update(updateData);

        // Reload with associations
        const updatedUsage = await MaterialUsage.findByPk(usage.id, {
            include: [
                { model: MaterialMaster, as: 'materialMaster' },
                { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ]
        });

        res.json(updatedUsage);
    } catch (error) {
        console.error('Update Usage Error:', error);
        res.status(500).json({ message: 'Errore nella modifica', error: error.message });
    }
};

// Delete material usage
const deleteUsage = async (req, res) => {
    try {
        const { id } = req.params;

        const companyId = getCompanyId(req);
        if (!companyId) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const usage = await MaterialUsage.findOne({
            where: {
                id,
                companyId
            }
        });

        if (!usage) {
            return res.status(404).json({ message: 'Utilizzo materiale non trovato' });
        }

        // Check authorization
        if (usage.userId !== getUserId(req) && req.user.role !== 'owner') {
            return res.status(403).json({ message: 'Non autorizzato a eliminare questo record' });
        }

        await usage.destroy();

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
    updateUsage,
    deleteUsage
};
