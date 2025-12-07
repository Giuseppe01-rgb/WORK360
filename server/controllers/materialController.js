const { Material, ConstructionSite, MaterialMaster } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { normalizeMaterialInput } = require('../utils/materialNormalization');
const { assertSiteBelongsToCompany } = require('../utils/security');

const createMaterial = async (req, res, next) => {
    try {
        const { name, unit, quantity, siteId, site, category, notes } = req.body;
        const actualSiteId = siteId || site;
        const companyId = getCompanyId(req);

        await assertSiteBelongsToCompany(actualSiteId, companyId);

        const normalized = normalizeMaterialInput(name, unit);
        if (!normalized) {
            return res.status(400).json({ message: 'Nome materiale mancante' });
        }

        let materialMaster = await MaterialMaster.findOne({
            where: {
                companyId: companyId,
                normalizedKey: normalized.normalizedKey
            }
        });

        if (!materialMaster) {
            materialMaster = await MaterialMaster.create({
                companyId: companyId,
                ...normalized
            });
        }

        const material = await Material.create({
            userId: getUserId(req),
            companyId: companyId,
            siteId: actualSiteId,
            materialMasterId: materialMaster.id,
            name: materialMaster.displayName,
            unit: materialMaster.unit,
            quantity,
            category,
            notes
        });

        res.status(201).json(material);
    } catch (error) {
        next(error);
    }
};

const getMaterials = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = getCompanyId(req);

        const where = { companyId };
        if (siteId) {
            await assertSiteBelongsToCompany(siteId, companyId);
            where.siteId = siteId;
        }

        const materials = await Material.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json(materials);
    } catch (error) {
        next(error);
    }
};

module.exports = { createMaterial, getMaterials };
