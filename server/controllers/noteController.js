const Note = require('../models/Note');

const createNote = async (req, res) => {
    try {
        const note = await Note.create({
            ...req.body,
            user: req.user._id
        });

        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione della nota', error: error.message });
    }
};

const getNotes = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = siteId ? { site: siteId } : {};

        const notes = await Note.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero delle note', error: error.message });
    }
};

module.exports = { createNote, getNotes };
