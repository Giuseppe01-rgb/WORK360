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

        const company = quote.company;
        const { email, subject, message } = req.body;

        // Check if company has email configured (REQUIRED for multi-tenant)
        if (!company.emailConfig || !company.emailConfig.configured || !company.emailConfig.user) {
            return res.status(400).json({
                error: 'Email non configurata',
                message: 'Per inviare preventivi via email, devi prima configurare le credenziali email aziendali in Impostazioni Azienda.',
                action: 'configure_email'
            });
        }

        // Generate PDF
        const pdfBuffer = await generateQuotePDFBuffer(quote, company, req.user);

        // Send email using company-specific credentials
        const { sendEmailWithCompanyConfig } = require('../utils/emailService');
        await sendEmailWithCompanyConfig(
            company.emailConfig,
            email,
            subject,
            `<p>${message.replace(/\n/g, '<br>')}</p>`,
            pdfBuffer,
            `preventivo-${quote.number}.pdf`
        );

        res.json({ success: true, message: 'Email inviata con successo' });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({
            message: 'Errore nell\'invio dell\'email',
            error: error.message,
            details: error.response?.body || error.toString()
        });
    }
});
// Send SAL via email
router.post('/send-email/sal/:id', protect, requireOwner, async (req, res) => {
    try {
        const SAL = require('../models/SAL');
        const { generateSALPDF } = require('../utils/pdfGenerator');

        // We need a buffer generator for SAL similar to Quote
        // Since generateSALPDF writes to res, we need to adapt it or create a buffer version
        // For now, let's assume we can create a buffer version in pdfGenerator.js

        const sal = await SAL.findById(req.params.id)
            .populate('company')
            .populate('site');

        if (!sal) return res.status(404).json({ message: 'SAL non trovato' });

        if (sal.company._id.toString() !== req.user.company._id.toString()) {
            return res.status(403).json({ message: 'Non autorizzato' });
        }

        const company = sal.company;
        const { email, subject, message } = req.body;

        // Check if company has email configured
        if (!company.emailConfig || !company.emailConfig.configured || !company.emailConfig.user) {
            return res.status(400).json({
                error: 'Email non configurata',
                message: 'Per inviare SAL via email, devi prima configurare le credenziali email aziendali in Impostazioni Azienda.',
                action: 'configure_email'
            });
        }

        // Generate PDF Buffer
        // We need to implement generateSALPDFBuffer in utils/pdfGenerator.js first!
        // But for now, let's use the existing generateSALPDF and mock the response object to capture the stream?
        // No, better to add generateSALPDFBuffer to pdfGenerator.js

        const { generateSALPDFBuffer } = require('../utils/pdfGenerator');
        const pdfBuffer = await generateSALPDFBuffer(sal, company, sal.site);

        // Send email
        const { sendEmailWithCompanyConfig } = require('../utils/emailService');
        await sendEmailWithCompanyConfig(
            company.emailConfig,
            email,
            subject,
            `<p>${message.replace(/\n/g, '<br>')}</p>`,
            pdfBuffer,
            `sal-${sal.number}.pdf`
        );

        res.json({ success: true, message: 'Email inviata con successo' });
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({
            message: 'Errore nell\'invio dell\'email',
            error: error.message,
            details: error.response?.body || error.toString()
        });
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
