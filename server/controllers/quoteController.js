const Quote = require('../models/Quote');
const { generateQuotePDF } = require('../utils/pdfGenerator');

const createQuote = async (req, res) => {
    try {
        console.log('=== CREATE QUOTE REQUEST ===');
        console.log('User ID:', req.user?._id);
        console.log('User role:', req.user?.role);
        console.log('Company:', req.user?.company);
        console.log('Request body keys:', Object.keys(req.body));

        const { items, vatRate = 22 } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'È necessario aggiungere almeno una voce al preventivo' });
        }

        if (!req.user.company || !req.user.company._id) {
            console.error('User company not found!', req.user);
            return res.status(400).json({ message: 'Azienda non trovata. Rieffettua il login.' });
        }

        let subtotal = 0;

        // Recalculate totals to be safe
        const processedItems = items.map(item => {
            const total = item.quantity * item.unitPrice;
            subtotal += total;
            return { ...item, total };
        });

        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        console.log('Creating quote with company ID:', req.user.company._id);
        const quote = await Quote.create({
            ...req.body,
            company: req.user.company._id,
            items: processedItems,
            subtotal,
            vatAmount,
            total
        });

        console.log('Quote created successfully:', quote._id);
        res.status(201).json(quote);
    } catch (error) {
        console.error('Quote creation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Errore nella creazione del preventivo', error: error.message });
    }
};

const getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find({ company: req.user.company._id }).sort({ date: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei preventivi', error: error.message });
    }
};

const getQuote = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const downloadQuotePDF = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id).populate('company');
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company._id.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        // Pass user for signature
        generateQuotePDF(quote, quote.company, req.user, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nella generazione del PDF', error: error.message });
    }
};

// Update quote
const updateQuote = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        // Exclude company from update data - keep original company ID
        const { company: _, ...updateData } = req.body;
        const { items, vatRate = 22 } = updateData;
        let subtotal = 0;

        const processedItems = items.map(item => {
            const total = item.quantity * item.unitPrice;
            subtotal += total;
            return { ...item, total };
        });

        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        Object.assign(quote, {
            ...updateData,
            items: processedItems,
            subtotal,
            vatAmount,
            total
        });

        await quote.save();
        res.json(quote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del preventivo', error: error.message });
    }
};

// Delete quote
const deleteQuote = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        await quote.deleteOne();
        res.json({ message: 'Preventivo eliminato con successo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del preventivo', error: error.message });
    }
};

module.exports = { createQuote, getQuotes, getQuote, downloadQuotePDF, updateQuote, deleteQuote };
