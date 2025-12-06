const Note = require('../models/Note');
const { assertSiteBelongsToCompany } = require('../utils/security');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

const createNote = async (req, res, next) => {
    try {
        const { siteId, site, content, type } = req.body;
        const actualSiteId = siteId || site; // Support both siteId and site
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify site belongs to user's company
        await assertSiteBelongsToCompany(actualSiteId, companyId);

        const note = await Note.create({
            user: req.user._id,
            company: companyId,
            site: actualSiteId,
            type: type || 'note',
            content
        });

        res.status(201).json(note);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

const getNotes = async (req, res, next) => {
    try {
        const { siteId, type } = req.query;
        const companyId = req.user.company._id || req.user.company;
        const query = { company: companyId };

        if (siteId) {
            // SECURITY: Verify site belongs to company
            await assertSiteBelongsToCompany(siteId, companyId);
            query.site = siteId;
        }

        if (type) {
            query.type = type;
        }

        const notes = await Note.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(notes);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

const deleteNote = async (req, res, next) => {
    try {
        const companyId = req.user.company._id || req.user.company;
        const note = await Note.findOne({
            _id: req.params.id,
            company: companyId
        });

        if (!note) {
            return res.status(404).json({ message: 'Nota non trovata' });
        }

        await note.deleteOne();
        res.json({ message: 'Nota eliminata con successo' });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

module.exports = { createNote, getNotes, deleteNote };
