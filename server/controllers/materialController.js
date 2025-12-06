const Material = require('../models/Material');
const ConstructionSite = require('../models/ConstructionSite');
const MaterialMaster = require('../models/MaterialMaster');
const { normalizeMaterialInput } = require('../utils/materialNormalization');
const { assertSiteBelongsToCompany } = require('../utils/security');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

const createMaterial = async (req, res, next) => {
    try {
        const { name, unit, quantity, siteId, site, category, notes } = req.body;
        const actualSiteId = siteId || site; // Support both siteId and site
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(actualSiteId, companyId);

        // 1. Normalize Input
        const normalized = normalizeMaterialInput(name, unit);

        if (!normalized) {
            return res.status(400).json({ message: 'Nome materiale mancante' });
        }

        // 2. Find or Create MaterialMaster
        let materialMaster = await MaterialMaster.findOne({
            company: companyId,
            normalizedKey: normalized.normalizedKey
        });

        if (!materialMaster) {
            materialMaster = await MaterialMaster.create({
                company: companyId,
                ...normalized
            });
        }

        // 3. Create Material Usage
        const material = await Material.create({
            user: req.user._id,
            company: companyId,
            site: actualSiteId,
            materialMaster: materialMaster._id,
            name: materialMaster.displayName, // Keep for backward compatibility
            unit: materialMaster.unit,        // Keep for backward compatibility
            quantity,
            category: category || materialMaster.family,
            notes
        });

        res.status(201).json(material);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

const getMaterials = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = req.user.company._id || req.user.company;
        const query = { company: companyId };

        if (siteId) {
            // SECURITY: Verify site belongs to company before filtering
            await assertSiteBelongsToCompany(siteId, companyId);
            query.site = siteId;
        }

        const materials = await Material.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .populate('materialMaster')
            .sort({ date: -1 });

        res.json(materials);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

module.exports = { createMaterial, getMaterials };
