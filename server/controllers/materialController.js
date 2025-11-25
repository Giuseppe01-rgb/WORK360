const Material = require('../models/Material');
const ConstructionSite = require('../models/ConstructionSite');
const MaterialMaster = require('../models/MaterialMaster');
const { normalizeMaterialInput } = require('../utils/materialNormalization');

const createMaterial = async (req, res) => {
    try {
        const { name, unit, quantity, site, category, notes } = req.body;

        // Validate Site Ownership
        const constructionSite = await ConstructionSite.findOne({
            _id: site,
            company: req.user.company._id
        });

        if (!constructionSite) {
            return res.status(403).json({ message: 'Cantiere non valido o non autorizzato' });
        }

        // 1. Normalize Input
        const normalized = normalizeMaterialInput(name, unit);

        if (!normalized) {
            return res.status(400).json({ message: 'Nome materiale mancante' });
        }

        // 2. Find or Create MaterialMaster
        let materialMaster = await MaterialMaster.findOne({
            company: req.user.company._id,
            normalizedKey: normalized.normalizedKey
        });

        if (!materialMaster) {
            materialMaster = await MaterialMaster.create({
                company: req.user.company._id,
                ...normalized
            });
        }

        // 3. Create Material Usage
        const material = await Material.create({
            user: req.user._id,
            company: req.user.company._id,
            site,
            materialMaster: materialMaster._id,
            name: materialMaster.displayName, // Keep for backward compatibility
            unit: materialMaster.unit,        // Keep for backward compatibility
            quantity,
            category: category || materialMaster.family,
            notes
        });

        res.status(201).json(material);
    } catch (error) {
        console.error('Create Material Error:', error);
        res.status(500).json({ message: 'Errore nella creazione del materiale', error: error.message });
    }
};

const getMaterials = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = { company: req.user.company._id };

        if (siteId) {
            query.site = siteId;
        }

        const materials = await Material.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .populate('materialMaster')
            .sort({ date: -1 });

        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei materiali', error: error.message });
    }
};

module.exports = { createMaterial, getMaterials };
