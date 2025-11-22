const SAL = require('../models/SAL');
const ConstructionSite = require('../models/ConstructionSite');
const { generateSALPDF } = require('../utils/pdfGenerator');

const createSAL = async (req, res) => {
    try {
        const sal = await SAL.create({
            ...req.body,
            company: req.user.company._id
        });

        res.status(201).json(sal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella creazione del SAL', error: error.message });
    }
};

const getSALs = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = { company: req.user.company._id };
        if (siteId) query.site = siteId;

        const sals = await SAL.find(query)
            .populate('site', 'name')
            .sort({ date: -1 });
        res.json(sals);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei SAL', error: error.message });
    }
};

const downloadSALPDF = async (req, res) => {
    try {
        const sal = await SAL.findById(req.params.id)
            .populate('company')
            .populate('site');

        if (!sal) return res.status(404).json({ message: 'SAL non trovato' });

        if (sal.company._id.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        generateSALPDF(sal, sal.company, sal.site, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella generazione del PDF', error: error.message });
    }
};

module.exports = { createSAL, getSALs, downloadSALPDF };
