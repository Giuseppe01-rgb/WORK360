const { Note, ConstructionSite, User } = require('../models');
const { assertSiteBelongsToCompany } = require('../utils/security');

const createNote = async (req, res, next) => {
    try {
        const { siteId, content, type } = req.body;
        const companyId = req.user.company._id || req.user.company;

        await assertSiteBelongsToCompany(siteId, companyId);

        const note = await Note.create({
            userId: req.user._id,
            siteId,
            companyId,
            content,
            type: type || 'note'
        });

        res.status(201).json(note);
    } catch (error) {
        next(error);
    }
};

const getNotes = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = req.user.company._id || req.user.company;

        const where = { companyId };
        if (siteId) {
            await assertSiteBelongsToCompany(siteId, companyId);
            where.siteId = siteId;
        }

        const notes = await Note.findAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json(notes);
    } catch (error) {
        next(error);
    }
};

const deleteNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company._id || req.user.company;

        const note = await Note.findOne({
            where: {
                id,
                companyId,
                userId: req.user._id
            }
        });

        if (!note) {
            return res.status(404).json({ message: 'Nota non trovata' });
        }

        await note.destroy();
        res.json({ message: 'Nota eliminata con successo' });
    } catch (error) {
        next(error);
    }
};

module.exports = { createNote, getNotes, deleteNote };
