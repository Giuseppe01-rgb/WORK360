const Economia = require('../models/Economia');
const ConstructionSite = require('../models/ConstructionSite');
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
        const companyId = req.user.company._id || req.user.company;

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
            worker: req.user._id,
            site,
            hours,
            description: description.trim()
        });

        await economia.populate('worker', 'name surname');
        await economia.populate('site', 'name');

        res.status(201).json(economia);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Get all economie for a specific site (owner only)
exports.getEconomiesBySite = async (req, res, next) => {
    try {
        const { siteId } = req.params;
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        const economie = await Economia.find({ site: siteId })
            .populate('worker', 'name surname')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(economie);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Delete economia (owner only)
exports.deleteEconomia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify economia exists and belongs to user's company (via site)
        const economia = await assertEconomiaBelongsToCompany(id, companyId);

        await economia.deleteOne();
        res.json({ message: 'Economia eliminata con successo' });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};
