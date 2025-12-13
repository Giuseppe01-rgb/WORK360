const { SiteAccounting, ConstructionSite, Company } = require('../models');
const { getUserId, getCompanyId } = require('../utils/sequelizeHelpers');
const { sanitizeAllDates } = require('../utils/dateValidator');
const PDFDocument = require('pdfkit');

// Create new Site Accounting
exports.createSiteAccounting = async (req, res) => {
    try {
        const { site, number, issueDate, periodStart, periodEnd, client, items, notes } = req.body;

        // Calculate totals from items
        const processedItems = (items || []).map(item => ({
            description: item.description || '',
            unit: item.unit || '',
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
        }));

        const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

        // Sanitize dates
        const accountingData = sanitizeAllDates({
            ownerId: getUserId(req),
            siteId: site || null,
            number: number || '',
            issueDate: issueDate || null,
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            client: client || { name: '', vatNumber: '', fiscalCode: '', address: '' },
            items: processedItems,
            subtotal,
            total: subtotal,
            notes: notes || ''
        });

        const accounting = await SiteAccounting.create(accountingData);

        // Reload with site association if available
        await accounting.reload({
            include: [{ model: ConstructionSite, as: 'site', required: false }]
        });

        res.status(201).json(accounting);
    } catch (error) {
        console.error('Error creating Site Accounting:', error);
        res.status(500).json({ message: 'Errore nella creazione della contabilità', error: error.message });
    }
};

// Get all Site Accountings for owner
exports.getAllSiteAccountings = async (req, res) => {
    try {
        const accountings = await SiteAccounting.findAll({
            where: { ownerId: getUserId(req) },
            include: [{ model: ConstructionSite, as: 'site', required: false }],
            order: [['createdAt', 'DESC']]
        });

        res.json(accountings);
    } catch (error) {
        console.error('Error getting Site Accountings:', error);
        res.status(500).json({ message: 'Errore nel recupero delle contabilità', error: error.message });
    }
};

// Get single Site Accounting by ID
exports.getSiteAccountingById = async (req, res) => {
    try {
        const accounting = await SiteAccounting.findOne({
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            },
            include: [{ model: ConstructionSite, as: 'site', required: false }]
        });

        if (!accounting) {
            return res.status(404).json({ message: 'Contabilità non trovata' });
        }

        res.json(accounting);
    } catch (error) {
        console.error('Error getting Site Accounting:', error);
        res.status(500).json({ message: 'Errore nel recupero della contabilità', error: error.message });
    }
};

// Update Site Accounting
exports.updateSiteAccounting = async (req, res) => {
    try {
        const { site, number, issueDate, periodStart, periodEnd, client, items, notes } = req.body;

        const accounting = await SiteAccounting.findOne({
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            }
        });

        if (!accounting) {
            return res.status(404).json({ message: 'Contabilità non trovata' });
        }

        // Process items and calculate totals
        const processedItems = (items || []).map(item => ({
            description: item.description || '',
            unit: item.unit || '',
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
        }));

        const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

        // Build update data
        const updateData = sanitizeAllDates({
            siteId: site || null,
            number: number || '',
            issueDate: issueDate || null,
            periodStart: periodStart || null,
            periodEnd: periodEnd || null,
            client: client || { name: '', vatNumber: '', fiscalCode: '', address: '' },
            items: processedItems,
            subtotal,
            total: subtotal,
            notes: notes || ''
        });

        await accounting.update(updateData);

        // Reload with associations
        await accounting.reload({
            include: [{ model: ConstructionSite, as: 'site', required: false }]
        });

        res.json(accounting);
    } catch (error) {
        console.error('Error updating Site Accounting:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento della contabilità', error: error.message });
    }
};

// Delete Site Accounting
exports.deleteSiteAccounting = async (req, res) => {
    try {
        const accounting = await SiteAccounting.findOne({
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            }
        });

        if (!accounting) {
            return res.status(404).json({ message: 'Contabilità non trovata' });
        }

        await accounting.destroy();
        res.json({ message: 'Contabilità eliminata con successo' });
    } catch (error) {
        console.error('Error deleting Site Accounting:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione della contabilità', error: error.message });
    }
};

// Download Site Accounting PDF
exports.downloadSiteAccountingPDF = async (req, res) => {
    try {
        const accounting = await SiteAccounting.findOne({
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            },
            include: [{ model: ConstructionSite, as: 'site', required: false }]
        });

        if (!accounting) {
            return res.status(404).json({ message: 'Contabilità non trovata' });
        }

        // Get company details
        const companyId = getCompanyId(req);
        let company = null;
        if (companyId) {
            company = await Company.findByPk(companyId);
        }

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contabilita-${accounting.number || accounting.id}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('CONTABILITÀ CANTIERE', { align: 'center' });
        doc.moveDown();

        // Company info (if available)
        if (company) {
            doc.fontSize(12).font('Helvetica-Bold').text(company.name || '');
            doc.fontSize(10).font('Helvetica')
                .text(company.address || '')
                .text(`P.IVA: ${company.vatNumber || ''}`);
            doc.moveDown();
        }

        // Document info
        doc.fontSize(10).font('Helvetica');
        if (accounting.number) {
            doc.text(`Numero SAL: ${accounting.number}`);
        }
        if (accounting.issueDate) {
            doc.text(`Data Emissione: ${new Date(accounting.issueDate).toLocaleDateString('it-IT')}`);
        }
        if (accounting.periodStart && accounting.periodEnd) {
            doc.text(`Periodo: ${new Date(accounting.periodStart).toLocaleDateString('it-IT')} - ${new Date(accounting.periodEnd).toLocaleDateString('it-IT')}`);
        }
        if (accounting.site) {
            doc.text(`Cantiere: ${accounting.site.name}`);
        }
        doc.moveDown();

        // Client info
        const client = accounting.client || {};
        if (client.name || client.vatNumber || client.fiscalCode || client.address) {
            doc.font('Helvetica-Bold').text('Committente:');
            doc.font('Helvetica');
            if (client.name) doc.text(client.name);
            if (client.vatNumber) doc.text(`P.IVA: ${client.vatNumber}`);
            if (client.fiscalCode) doc.text(`C.F.: ${client.fiscalCode}`);
            if (client.address) doc.text(client.address);
            doc.moveDown();
        }

        // Items table
        const items = accounting.items || [];
        if (items.length > 0) {
            doc.font('Helvetica-Bold').text('Voci Contabilità:', { underline: true });
            doc.moveDown(0.5);

            // Table header
            const tableTop = doc.y;
            const colWidths = { desc: 200, unit: 50, qty: 60, price: 70, total: 80 };

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('Descrizione', 50, tableTop);
            doc.text('U.M.', 250, tableTop);
            doc.text('Q.tà', 300, tableTop);
            doc.text('Prezzo', 360, tableTop);
            doc.text('Totale', 430, tableTop);

            doc.moveTo(50, tableTop + 15).lineTo(520, tableTop + 15).stroke();

            // Table rows
            doc.font('Helvetica').fontSize(9);
            let yPos = tableTop + 25;

            items.forEach(item => {
                // Handle multi-line descriptions
                const descHeight = doc.heightOfString(item.description || '', { width: colWidths.desc });
                const rowHeight = Math.max(15, descHeight + 5);

                // Check for page break
                if (yPos + rowHeight > 700) {
                    doc.addPage();
                    yPos = 50;
                }

                doc.text(item.description || '', 50, yPos, { width: colWidths.desc });
                doc.text(item.unit || '', 250, yPos);
                doc.text((item.quantity || 0).toString(), 300, yPos);
                doc.text(`€ ${(item.unitPrice || 0).toFixed(2)}`, 360, yPos);
                doc.text(`€ ${(item.total || 0).toFixed(2)}`, 430, yPos);

                yPos += rowHeight;
            });

            // Total line
            doc.moveTo(50, yPos + 5).lineTo(520, yPos + 5).stroke();
            yPos += 15;

            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('TOTALE:', 360, yPos);
            doc.text(`€ ${(accounting.total || 0).toFixed(2)}`, 430, yPos);
        }

        // Notes
        if (accounting.notes) {
            doc.moveDown(2);
            doc.font('Helvetica-Bold').fontSize(10).text('Note:');
            doc.font('Helvetica').text(accounting.notes);
        }

        doc.end();
    } catch (error) {
        console.error('Error downloading Site Accounting PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Errore nel download del PDF', error: error.message });
        }
    }
};
