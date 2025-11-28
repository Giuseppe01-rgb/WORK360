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

module.exports = { createNote, getNotes };
