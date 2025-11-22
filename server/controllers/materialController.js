const Material = require('../models/Material');

const createMaterial = async (req, res) => {
    try {
        const material = await Material.create({
            ...req.body,
            user: req.user._id
        });

        res.status(201).json(material);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del materiale', error: error.message });
    }
};

const getMaterials = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = siteId ? { site: siteId } : {};

        const materials = await Material.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei materiali', error: error.message });
    }
};

module.exports = { createMaterial, getMaterials };
