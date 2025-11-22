const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const Quote = require('../models/Quote');
const { sendEmailWithPDF } = require('../utils/emailService');
const { generateWhatsAppLink } = require('../utils/whatsappService');
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

        doc.text(`IVA (${quote.vatRate}%):`, 350, y, { width: 70, align: 'right' });
        doc.text(`€ ${quote.vatAmount.toFixed(2)}`, 420, y, { width: 90, align: 'right' });
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

// Send quote via email
router.post('/send-email/quote/:id', protect, requireOwner, async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id).populate('company');
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company._id.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        const { email, subject, message } = req.body;

        // Generate PDF
        const pdfBuffer = await generatePDFBuffer(quote, quote.company, req.user);

        // Send email
        await sendEmailWithPDF(
            email,
            subject,
            `<p>${message.replace(/\n/g, '<br>')}</p>`,
            pdfBuffer,
            `preventivo-${quote.number}.pdf`
        );

        res.json({ success: true, message: 'Email inviata con successo' });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({ message: 'Errore nell\'invio dell\'email', error: error.message });
    }
});

// Send quote via WhatsApp
router.post('/send-whatsapp/quote/:id', protect, requireOwner, async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id).populate('company');
        if (!quote) return res.status(404).json({ message: 'Preventivo non trovato' });

        if (quote.company._id.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        const { phone, message } = req.body;

        // Generate wa.me link (no PDF upload needed)
        const whatsappLink = generateWhatsAppLink(phone, message);

        res.json({ success: true, whatsappLink });
    } catch (error) {
        console.error('WhatsApp error:', error);
        res.status(500).json({ message: 'Errore WhatsApp', error: error.message });
    }
});

module.exports = router;
