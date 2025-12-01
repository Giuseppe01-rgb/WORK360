const SAL = require('../models/SAL');
const Site = require('../models/Site');

// Create new SAL
exports.createSAL = async (req, res) => {
    try {
        const { site, date, periodStart, periodEnd, client, contractValue, previousAmount, currentAmount, penalties, notes } = req.body;

        // Calculate completion percentage
        const totalSpent = previousAmount + currentAmount;
        const completionPercentage = Math.min(100, Math.max(0, (totalSpent / contractValue) * 100));

        // Generate SAL number
        const year = new Date().getFullYear();
        const count = await SAL.countDocuments({ owner: req.user._id });
        const number = `SAL-${year}-${String(count + 1).padStart(4, '0')}`;

        const sal = new SAL({
            owner: req.user._id,
            site,
            number,
            date,
            periodStart,
            periodEnd,
            client,
            contractValue,
            previousAmount,
            currentAmount,
            completionPercentage: Math.round(completionPercentage * 100) / 100,
            penalties: penalties || 0,
            notes: notes || ''
        });

        await sal.save();
        await sal.populate('site');

        res.status(201).json(sal);
    } catch (error) {
        console.error('Error creating SAL:', error);
        res.status(500).json({ message: 'Errore nella creazione del SAL', error: error.message });
    }
};

// Get all SALs for owner
exports.getAllSALs = async (req, res) => {
    try {
        const sals = await SAL.find({ owner: req.user._id })
            .populate('site')
            .sort({ date: -1 });

        res.json(sals);
    } catch (error) {
        console.error('Error getting SALs:', error);
        res.status(500).json({ message: 'Errore nel recupero dei SAL', error: error.message });
    }
};

// Get single SAL by ID
exports.getSALById = async (req, res) => {
    try {
        const sal = await SAL.findOne({
            _id: req.params.id,
            owner: req.user._id
        }).populate('site');

        if (!sal) {
            return res.status(404).json({ message: 'SAL non trovato' });
        }

        res.json(sal);
    } catch (error) {
        console.error('Error getting SAL:', error);
        res.status(500).json({ message: 'Errore nel recupero del SAL', error: error.message });
    }
};

// Update SAL
exports.updateSAL = async (req, res) => {
    try {
        const { site, date, periodStart, periodEnd, client, contractValue, previousAmount, currentAmount, penalties, notes } = req.body;

        const sal = await SAL.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!sal) {
            return res.status(404).json({ message: 'SAL non trovato' });
        }

        // Recalculate completion percentage
        const totalSpent = previousAmount + currentAmount;
        const completionPercentage = Math.min(100, Math.max(0, (totalSpent / contractValue) * 100));

        // Update fields
        if (site) sal.site = site;
        if (date) sal.date = date;
        if (periodStart) sal.periodStart = periodStart;
        if (periodEnd) sal.periodEnd = periodEnd;
        if (client) sal.client = client;
        if (contractValue !== undefined) sal.contractValue = contractValue;
        if (previousAmount !== undefined) sal.previousAmount = previousAmount;
        if (currentAmount !== undefined) sal.currentAmount = currentAmount;
        if (penalties !== undefined) sal.penalties = penalties;
        if (notes !== undefined) sal.notes = notes;

        sal.completionPercentage = Math.round(completionPercentage * 100) / 100;

        await sal.save();
        await sal.populate('site');

        res.json(sal);
    } catch (error) {
        console.error('Error updating SAL:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del SAL', error: error.message });
    }
};

// Delete SAL
exports.deleteSAL = async (req, res) => {
    try {
        const sal = await SAL.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!sal) {
            return res.status(404).json({ message: 'SAL non trovato' });
        }

        await sal.deleteOne();
        res.json({ message: 'SAL eliminato con successo' });
    } catch (error) {
        console.error('Error deleting SAL:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del SAL', error: error.message });
    }
};
