const Economia = require('../models/Economia');
const ConstructionSite = require('../models/ConstructionSite');

// Create new economia (overtime record)
exports.createEconomia = async (req, res) => {
    try {
        const { site, hours, description } = req.body;

        // Validate required fields
        if (!site) {
            return res.status(400).json({ message: 'Campo cantiere obbligatorio' });
        }
        if (!hours || hours <= 0) {
            return res.status(400).json({ message: 'Le ore devono essere maggiori di zero' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ message: 'La descrizione deve contenere almeno 10 caratteri' });
        }

        // Verify site exists
        const siteExists = await ConstructionSite.findById(site);
        if (!siteExists) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        const economia = await Economia.create({
            worker: req.user._id,
            site,
            hours,
            description: description.trim()
        });

        await economia.populate('worker', 'name surname');
        await economia.populate('site', 'name');

        res.status(201).json(economia);
    } catch (error) {
        console.error('Error creating economia:', error);
        res.status(500).json({ message: 'Errore nella creazione dell\'economia', error: error.message });
    }
};

// Get all economie for a specific site (owner only)
exports.getEconomiesBySite = async (req, res) => {
    try {
        const { siteId } = req.params;

        // Verify site exists and belongs to owner's company
        const site = await ConstructionSite.findById(siteId);
        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        const economie = await Economia.find({ site: siteId })
            .populate('worker', 'name surname')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(economie);
    } catch (error) {
        console.error('Error fetching economie:', error);
        res.status(500).json({ message: 'Errore nel recupero delle economie', error: error.message });
    }
};

// Delete economia (owner only)
exports.deleteEconomia = async (req, res) => {
    try {
        const economia = await Economia.findById(req.params.id);

        if (!economia) {
            return res.status(404).json({ message: 'Economia non trovata' });
        }

        await economia.deleteOne();
        res.json({ message: 'Economia eliminata con successo' });
    } catch (error) {
        console.error('Error deleting economia:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione dell\'economia', error: error.message });
    }
};
