const { Economia, User, ConstructionSite } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { assertSiteBelongsToCompany, assertEconomiaBelongsToCompany } = require('../utils/security');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

// Create new economia (overtime record)
exports.createEconomia = async (req, res, next) => {
    try {
        const { site, hours, description } = req.body;
        const companyId = getCompanyId(req);

        // Validate required fields
        if (!site) {
            return res.status(400).json({ message: 'Campo cantiere obbligatorio' });
        }
        if (!hours || hours <= 0) {
            return res.status(400).json({ message: 'Le ore devono essere maggiori di zero' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ message: 'La descrizione deve contenere almeno 10 caratteri' });
        }

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(site, companyId);

        const economia = await Economia.create({
            workerId: getUserId(req),
            siteId: site,
            hours,
            description: description.trim()
        });

        // Reload with associations
        await economia.reload({
            include: [
                { model: User, as: 'worker', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ]
        });

        res.status(201).json(economia);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Get all economie for a specific site (owner only)
exports.getEconomiesBySite = async (req, res, next) => {
    try {
        const { siteId } = req.params;
        const companyId = getCompanyId(req);

        // Validate siteId
        if (!siteId || siteId === 'undefined' || siteId === 'null') {
            return res.status(400).json({ message: 'ID cantiere non valido' });
        }

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        const economie = await Economia.findAll({
            where: { siteId },
            include: [
                { model: User, as: 'worker', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        res.json(economie);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Delete economia (owner only)
exports.deleteEconomia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);

        // SECURITY: Verify economia exists and belongs to user's company (via site)
        const economia = await assertEconomiaBelongsToCompany(id, companyId);

        await economia.destroy();
        res.json({ message: 'Economia eliminata con successo' });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Create bulk economia (owner only) - Quick entry for multiple hours
exports.createBulkEconomia = async (req, res, next) => {
    try {
        const { siteId, hours, description } = req.body;
        const companyId = getCompanyId(req);
        const userId = getUserId(req);

        // Validate required fields
        if (!siteId) {
            return res.status(400).json({ message: 'Campo cantiere obbligatorio' });
        }
        if (!hours || hours <= 0) {
            return res.status(400).json({ message: 'Le ore devono essere maggiori di zero' });
        }
        if (!description || description.trim().length < 5) {
            return res.status(400).json({ message: 'La descrizione deve contenere almeno 5 caratteri' });
        }

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        // Create single economia with all the hours (bulk entry)
        const economia = await Economia.create({
            workerId: userId, // Owner creates it, so use owner's ID
            siteId,
            hours: parseFloat(hours),
            description: description.trim()
        });

        // Reload with associations
        await economia.reload({
            include: [
                { model: User, as: 'worker', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ]
        });

        res.status(201).json({
            success: true,
            data: economia,
            message: `${hours} ore di economie aggiunte con successo`
        });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};
