const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateQuotePDF = (quote, company, user, res) => {
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=preventivo-${quote.number}.pdf`);

    doc.pipe(res);

    // Header
    if (company.logo) {
        try {
            // Convert relative path to absolute path
            const logoPath = path.join(__dirname, '..', 'public', company.logo);
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 50 });
            }
        } catch (e) {
            console.error('Error loading logo:', e);
        }
    }

    doc.fontSize(20).text(company.name, 110, 57)
        .fontSize(10).text(company.name, 200, 65, { align: 'right' })
        .text(company.address?.street || '', 200, 80, { align: 'right' })
        .text(`${company.address?.city || ''} ${company.address?.province || ''}`, 200, 95, { align: 'right' })
        .moveDown();

    // Title
    doc.fontSize(20).text('PREVENTIVO', 50, 160);

    // Details
    doc.fontSize(10).text(`Numero: ${quote.number}`, 50, 200)
        .text(`Data: ${new Date(quote.date).toLocaleDateString('it-IT')}`, 50, 215)
        .text(`Cliente: ${quote.client.name}`, 300, 200)
        .text(quote.client.address || '', 300, 215)
        .text(`P.IVA: ${quote.client.vatNumber || '-'}`, 300, 230);

    // Table Header
    const tableTop = 300;
    doc.font('Helvetica-Bold');
    doc.text('Descrizione', 50, tableTop)
        .text('Q.tà', 280, tableTop, { width: 50, align: 'right' })
        .text('Prezzo', 330, tableTop, { width: 70, align: 'right' })
        .text('Totale', 400, tableTop, { width: 90, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Items
    let i = 0;
    doc.font('Helvetica');
    quote.items.forEach(item => {
        const y = tableTop + 30 + (i * 20);
        doc.text(item.description, 50, y)
            .text(item.quantity, 280, y, { width: 50, align: 'right' })
            .text(`€ ${item.unitPrice.toFixed(2)}`, 330, y, { width: 70, align: 'right' })
            .text(`€ ${item.total.toFixed(2)}`, 400, y, { width: 90, align: 'right' });
        i++;
    });

    // Totals
    const subtotalY = tableTop + 30 + (i * 20) + 20;
    doc.moveTo(50, subtotalY).lineTo(550, subtotalY).stroke();

    doc.text('Imponibile:', 330, subtotalY + 10, { width: 70, align: 'right' })
        .text(`€ ${quote.subtotal.toFixed(2)}`, 400, subtotalY + 10, { width: 90, align: 'right' });

    doc.text(`IVA (${quote.vatRate}%):`, 330, subtotalY + 25, { width: 70, align: 'right' })
        .text(`€ ${quote.vatAmount.toFixed(2)}`, 400, subtotalY + 25, { width: 90, align: 'right' });

    doc.font('Helvetica-Bold').fontSize(12)
        .text('TOTALE:', 330, subtotalY + 45, { width: 70, align: 'right' })
        .text(`€ ${quote.total.toFixed(2)}`, 400, subtotalY + 45, { width: 90, align: 'right' });

    // User Signature (from base64)
    if (user && user.signature) {
        try {
            // Remove data:image prefix if present
            const base64Data = user.signature.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            doc.fontSize(10).font('Helvetica').text('Firma Titolare:', 50, subtotalY + 100);
            doc.image(buffer, 50, subtotalY + 120, { width: 150 });
        } catch (e) {
            console.error('Error loading user signature:', e);
        }
    }

    doc.end();
};

const generateSALPDF = (sal, company, site, res) => {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sal-${sal.number}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text(company.name, 50, 50);
    doc.fontSize(10).text('STATO AVANZAMENTO LAVORI', 50, 80);

    // Details
    doc.fontSize(12).text(`Cantiere: ${site.name}`, 50, 150)
        .text(`Indirizzo: ${site.address}`, 50, 165)
        .text(`SAL N.: ${sal.number}`, 50, 190)
        .text(`Data: ${new Date(sal.date).toLocaleDateString('it-IT')}`, 50, 205);

    // Body
    doc.moveDown(2);
    doc.fontSize(14).text('Descrizione Lavori Eseguiti', 50, doc.y);
    doc.fontSize(12).text(sal.description, 50, doc.y + 10);

    doc.moveDown(2);
    doc.text(`Percentuale Completamento: ${sal.completionPercentage}%`);
    doc.font('Helvetica-Bold').text(`Importo Maturato: € ${sal.amount.toFixed(2)}`);

    // Signature
    if (sal.signature && fs.existsSync(sal.signature)) {
        try {
            doc.moveDown(4);
            doc.text('Firma:', 50, doc.y);
            doc.image(sal.signature, 50, doc.y + 20, { width: 150 });
        } catch (e) {
            console.error('Error loading signature:', e);
        }
    }

    doc.end();
};

module.exports = { generateQuotePDF, generateSALPDF };
