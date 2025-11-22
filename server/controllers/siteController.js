const ConstructionSite = require('../models/ConstructionSite');

const createSite = async (req, res) => {
    try {
        const site = await ConstructionSite.create({
            ...req.body,
            company: req.user.company._id
        });

        res.status(201).json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del cantiere', error: error.message });
    }
};

const getSites = async (req, res) => {
    try {
        console.log('GetSites User:', req.user._id, 'Company:', req.user.company?._id);
        const sites = await ConstructionSite.find({ company: req.user.company._id })
            .populate('assignedWorkers', 'firstName lastName username')
            .sort({ startDate: -1 });
        console.log('Sites found:', sites.length);
        res.json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei cantieri', error: error.message });
    }
};

const getSite = async (req, res) => {
    try {
        const site = await ConstructionSite.findById(req.params.id)
            .populate('assignedWorkers', 'firstName lastName username');

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        res.json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero del cantiere', error: error.message });
    }
};

const updateSite = async (req, res) => {
    try {
        const site = await ConstructionSite.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        res.json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento del cantiere', error: error.message });
    }
};

const deleteSite = async (req, res) => {
    try {
        const site = await ConstructionSite.findByIdAndDelete(req.params.id);

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        res.json({ message: 'Cantiere eliminato' });
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'eliminazione del cantiere', error: error.message });
    }
};

module.exports = { createSite, getSites, getSite, updateSite, deleteSite };
