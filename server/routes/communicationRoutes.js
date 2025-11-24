const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const Quote = require('../models/Quote');
const { sendEmailWithPDF } = require('../utils/emailService');
const { generateWhatsAppLink } = require('../utils/whatsappService');
const { generateQuotePDFBuffer } = require('../utils/pdfGenerator');


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
        const pdfBuffer = await generateQuotePDFBuffer(quote, quote.company, req.user);

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
