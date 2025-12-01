const Note = require('../models/Note');

const createNote = async (req, res) => {
    try {
        const { siteId, site, content, type } = req.body;
        const actualSiteId = siteId || site; // Support both siteId and site

        const note = await Note.create({
            user: req.user._id,
            company: req.user.company._id || req.user.company,
            site: actualSiteId,
            type: type || 'note',
            content
        });

        res.status(201).json(note);
    } catch (error) {
        console.error('Create Note Error:', error);
        res.status(500).json({ message: 'Errore nella creazione della nota', error: error.message });
    }
};

const getNotes = async (req, res) => {
    try {
        const { siteId, type } = req.query;
        const query = { company: req.user.company._id || req.user.company };

        if (siteId) {
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
        console.error('Get Notes Error:', error);
        res.status(500).json({ message: 'Errore nel recupero delle note', error: error.message });
    }
};

const deleteNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Nota non trovata' });
        }

        // Robust ownership check
        const userCompanyId = req.user.company?._id || req.user.company;
        const noteCompanyId = note.company;
        const userId = req.user._id;
        const noteUserId = note.user;

        const isCompanyMatch = userCompanyId && noteCompanyId && userCompanyId.toString() === noteCompanyId.toString();
        const isCreatorMatch = userId && noteUserId && userId.toString() === noteUserId.toString();

        if (!isCompanyMatch && !isCreatorMatch) {
            console.warn(`Unauthorized delete attempt. User: ${userId}, Note: ${note._id}`);
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        await note.deleteOne();
        res.json({ message: 'Nota eliminata con successo' });
    } catch (error) {
        console.error('Delete Note Error:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione della nota', error: error.message });
    }
};

module.exports = { createNote, getNotes, deleteNote };
