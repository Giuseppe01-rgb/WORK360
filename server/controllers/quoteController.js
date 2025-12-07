const { Quote, Company } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { sanitizeAllDates } = require('../utils/dateValidator');
const { generateQuotePDF, generateQuotePDFBuffer } = require('../utils/pdfGenerator');
const { sendEmailWithPDF } = require('../utils/emailService');


const createQuote = async (req, res) => {
    try {
        console.log('=== CREATE QUOTE REQUEST ===');
        console.log('User ID:', getUserId(req));
        console.log('User role:', req.user?.role);
        console.log('Company:', getCompanyId(req));
        console.log('Request body keys:', Object.keys(req.body));

        const { items, vatRate = 22, client } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'È necessario aggiungere almeno una voce al preventivo' });
        }

        const companyId = getCompanyId(req);
        if (!companyId) {
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

        // Sanitize dates
        const quoteData = sanitizeAllDates({
            ...req.body,
            companyId,
            items: processedItems,
            subtotal,
            vatAmount,
            total
        });

        console.log('Creating quote with company ID:', companyId);
        const quote = await Quote.create(quoteData);

        console.log('Quote created successfully:', quote.id);

        // Auto-send email if client email is provided
        if (client && client.email) {
            try {
                console.log('Auto-sending email to:', client.email);

                // Get company details
                const company = await Company.findByPk(companyId);

                // Generate PDF
                const pdfBuffer = await generateQuotePDFBuffer(quote, company, req.user);

                // Send email
                await sendEmailWithPDF(
                    client.email,
                    `Preventivo N. ${quote.number} - ${company.name || 'WORK360'}`,
                    `<p>Gentile ${client.name},</p>
                     <p>In allegato trova il preventivo richiesto (N. ${quote.number}).</p>
                     <p>Rimaniamo a disposizione per qualsiasi chiarimento.</p>
                     <p>Cordiali saluti,<br>${company.name || 'WORK360'}</p>`,
                    pdfBuffer,
                    `preventivo-${quote.number}.pdf`
                );

                console.log('Email sent successfully to:', client.email);
            } catch (emailError) {
                console.error('Error sending auto-email:', emailError);
                // Don't fail the quote creation if email fails
            }
        }

        res.status(201).json(quote);
    } catch (error) {
        console.error('Quote creation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Errore nella creazione del preventivo', error: error.message });
    }
};

const getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.findAll({
            where: { companyId: getCompanyId(req) },
            order: [['date', 'DESC']]
        });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei preventivi', error: error.message });
    }
};

const getQuote = async (req, res) => {
    try {
        const quote = await Quote.findByPk(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.companyId !== getCompanyId(req)) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const downloadQuotePDF = async (req, res) => {
    try {
        const quote = await Quote.findByPk(req.params.id, {
            include: [{ model: Company, as: 'company' }]
        });

        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.companyId !== getCompanyId(req)) {
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
        const quote = await Quote.findByPk(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.companyId !== getCompanyId(req)) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        // Exclude company from update data - keep original company ID
        const { company: _, companyId: __, ...updateData } = req.body;
        const { items, vatRate = 22 } = updateData;
        let subtotal = 0;

        const processedItems = items.map(item => {
            const total = item.quantity * item.unitPrice;
            subtotal += total;
            return { ...item, total };
        });

        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        // Sanitize dates in update data
        const sanitizedUpdate = sanitizeAllDates({
            ...updateData,
            items: processedItems,
            subtotal,
            vatAmount,
            total
        });

        await quote.update(sanitizedUpdate);
        res.json(quote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del preventivo', error: error.message });
    }
};

// Delete quote
const deleteQuote = async (req, res) => {
    try {
        const quote = await Quote.findByPk(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.companyId !== getCompanyId(req)) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        await quote.destroy();
        res.json({ message: 'Preventivo eliminato con successo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del preventivo', error: error.message });
    }
};

module.exports = { createQuote, getQuotes, getQuote, downloadQuotePDF, updateQuote, deleteQuote };
