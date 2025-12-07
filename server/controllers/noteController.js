const { Note, ConstructionSite, User } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { assertSiteBelongsToCompany } = require('../utils/security');

const createNote = async (req, res, next) => {
    try {
        const { siteId, content, type } = req.body;
        const companyId = getCompanyId(req);

        await assertSiteBelongsToCompany(siteId, companyId);

        const note = await Note.create({
            userId: getUserId(req),
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
        const companyId = getCompanyId(req);

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
        const companyId = getCompanyId(req);

        const note = await Note.findOne({
            where: {
                id,
                companyId,
                userId: getUserId(req)
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
