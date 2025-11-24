const Quote = require('../models/Quote');
const Company = require('../models/Company');
const { generateQuotePDF } = require('../utils/pdfGenerator');
const { sendEmailWithPDF } = require('../utils/emailService');
const PDFDocument = require('pdfkit');

// Helper to generate PDF buffer
const generatePDFBuffer = (quote, company, user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // PDF Content
        doc.fontSize(20).text(company.name || 'WORK360', 50, 50);
        doc.fontSize(16).text('PREVENTIVO', 50, 100);
        doc.fontSize(12).text(`N. ${quote.number}`, 50, 130);
        doc.text(`Data: ${new Date(quote.date).toLocaleDateString('it-IT')}`, 50, 145);
        doc.text(`Cliente: ${quote.client.name}`, 50, 160);

        // Items table
        let y = 200;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Descrizione', 50, y);
        doc.text('Q.tà', 300, y, { width: 50, align: 'right' });
        doc.text('Prezzo', 350, y, { width: 70, align: 'right' });
        doc.text('Totale', 420, y, { width: 90, align: 'right' });

        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();

        y += 25;
        doc.font('Helvetica');
        quote.items.forEach(item => {
            doc.text(item.description, 50, y, { width: 240 });
            doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
            doc.text(`€ ${item.unitPrice.toFixed(2)}`, 350, y, { width: 70, align: 'right' });
            doc.text(`€ ${item.total.toFixed(2)}`, 420, y, { width: 90, align: 'right' });
            y += 20;
        });

        // Totals
        y += 20;
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;

        doc.text('Imponibile:', 350, y, { width: 70, align: 'right' });
        doc.text(`€ ${quote.subtotal.toFixed(2)}`, 420, y, { width: 90, align: 'right' });
        y += 15;

        // Show VAT line
        if (quote.vatRate === 0) {
            doc.text('Esente IVA:', 350, y, { width: 70, align: 'right' });
            doc.text('€ 0.00', 420, y, { width: 90, align: 'right' });
        } else {
            doc.text(`IVA (${quote.vatRate}%):`, 350, y, { width: 70, align: 'right' });
            doc.text(`€ ${quote.vatAmount.toFixed(2)}`, 420, y, { width: 90, align: 'right' });
        }
        y += 20;

        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('TOTALE:', 350, y, { width: 70, align: 'right' });
        doc.text(`€ ${quote.total.toFixed(2)}`, 420, y, { width: 90, align: 'right' });

        // Signature
        if (user && user.signature) {
            try {
                const base64Data = user.signature.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                doc.fontSize(10).font('Helvetica').text('Firma Titolare:', 50, y + 60);
                doc.image(buffer, 50, y + 80, { width: 150 });
            } catch (e) {
                console.error('Error adding signature:', e);
            }
        }

        doc.end();
    });
};

const createQuote = async (req, res) => {
    try {
        console.log('=== CREATE QUOTE REQUEST ===');
        console.log('User ID:', req.user?._id);
        console.log('User role:', req.user?.role);
        console.log('Company:', req.user?.company);
        console.log('Request body keys:', Object.keys(req.body));

        const { items, vatRate = 22, client } = req.body;

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

        // Auto-send email if client email is provided
        if (client && client.email) {
            try {
                console.log('Auto-sending email to:', client.email);

                // Get company details
                const company = await Company.findById(req.user.company._id);

                // Generate PDF
                const pdfBuffer = await generatePDFBuffer(quote, company, req.user);

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
