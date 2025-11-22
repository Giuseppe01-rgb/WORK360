const Equipment = require('../models/Equipment');

const createEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.create({
            ...req.body,
            user: req.user._id
        });

        res.status(201).json(equipment);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione dell\'attrezzatura', error: error.message });
    }
};

const getEquipment = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = siteId ? { site: siteId } : {};

        const equipment = await Equipment.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(equipment);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero delle attrezzature', error: error.message });
    }
};

module.exports = { createEquipment, getEquipment };
