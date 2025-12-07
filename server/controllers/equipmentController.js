const { Equipment, User, ConstructionSite } = require('../models');

const createEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.create({
            ...req.body,
            userId: req.user._id
        });

        res.status(201).json(equipment);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione dell\'attrezzatura', error: error.message });
    }
};

const getEquipment = async (req, res) => {
    try {
        const { siteId } = req.query;
        const where = siteId ? { siteId } : {};

        const equipment = await Equipment.findAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        res.json(equipment);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero delle attrezzature', error: error.message });
    }
};

module.exports = { createEquipment, getEquipment };
