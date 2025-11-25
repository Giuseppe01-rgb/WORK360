const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateQuotePDFBuffer = (quote, company, user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- HEADER (Carta Intestata) ---
        let headerY = 45;

        // Logo (Left)
        // Logo (Left)
        if (company.logo) {
            try {
                if (company.logo.startsWith('data:image')) {
                    const base64Data = company.logo.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    doc.image(buffer, 50, headerY, { width: 80 });
                } else {
                    // Legacy support for file paths
                    let logoPath = company.logo;
                    if (logoPath.startsWith('/')) logoPath = logoPath.substring(1); // Remove leading slash

                    // Check in uploads folder directly (since middleware saves to server/uploads)
                    const absolutePath = path.join(__dirname, '..', logoPath);

                    if (fs.existsSync(absolutePath)) {
                        doc.image(absolutePath, 50, headerY, { width: 80 });
                    }
                }
            } catch (e) {
                console.error('Error loading logo:', e);
            }
        }

        // Company Details (Right)
        doc.font('Helvetica-Bold').fontSize(16).text(company.name, 200, headerY, { align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor('#444444');

        let detailsY = headerY + 25;
        const addDetail = (text) => {
            if (text) {
                doc.text(text, 200, detailsY, { align: 'right' });
                detailsY += 12;
            }
        };

        addDetail(company.address?.street);
        addDetail(`${company.address?.cap || ''} ${company.address?.city || ''} (${company.address?.province || ''})`);
        addDetail(`P.IVA: ${company.piva || '-'}`);
        addDetail(`C.F.: ${company.taxCode || company.piva || '-'}`);
        if (company.reaNumber) addDetail(`REA: ${company.reaNumber}`);
        if (company.shareCapital) addDetail(`Cap. Soc.: ${company.shareCapital}`);
        if (company.pec) addDetail(`PEC: ${company.pec}`);
        if (company.email) addDetail(`Email: ${company.email}`);
        if (company.phone) addDetail(`Tel: ${company.phone}`);

        // Separator
        doc.moveDown(2);
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(2);

        // --- DOCUMENT INFO ---
        const startY = doc.y;

        // Left: Client Info
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text('Spett.le Cliente:', 50, startY);
        doc.font('Helvetica').fontSize(10).text(quote.client.name, 50, startY + 15);
        if (quote.client.address) doc.text(quote.client.address, 50, startY + 30);
        if (quote.client.vatNumber) doc.text(`P.IVA/C.F.: ${quote.client.vatNumber}`, 50, startY + 45);

        // Right: Quote Info
        doc.font('Helvetica-Bold').fontSize(14).text('PREVENTIVO', 300, startY, { align: 'right' });
        doc.font('Helvetica').fontSize(10);
        doc.text(`Numero: ${quote.number}`, 300, startY + 20, { align: 'right' });
        doc.text(`Data: ${new Date(quote.date).toLocaleDateString('it-IT')}`, 300, startY + 35, { align: 'right' });
        doc.text(`Validità: ${quote.validityDays || 30} giorni`, 300, startY + 50, { align: 'right' });

        doc.moveDown(4);

        // --- ITEMS TABLE ---
        const tableTop = doc.y + 20;
        const itemX = 50;
        const qtyX = 330;
        const priceX = 380;
        const totalX = 450;

        // Table Header
        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(9);
        doc.text('DESCRIZIONE', itemX, tableTop);
        doc.text('Q.TÀ', qtyX, tableTop, { width: 40, align: 'center' });
        doc.text('PREZZO', priceX, tableTop, { width: 60, align: 'right' });
        doc.text('TOTALE', totalX, tableTop, { width: 90, align: 'right' });

        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

        // Items Loop
        let y = tableTop + 25;
        doc.fillColor('#334155').font('Helvetica').fontSize(9);

        quote.items.forEach(item => {
            const descWidth = 270;
            const descHeight = doc.heightOfString(item.description, { width: descWidth });

            // Check page break
            if (y + descHeight > 700) {
                doc.addPage();
                y = 50;
            }

            doc.text(item.description, itemX, y, { width: descWidth });
            doc.text(item.quantity, qtyX, y, { width: 40, align: 'center' });
            doc.text(`€ ${item.unitPrice.toFixed(2)}`, priceX, y, { width: 60, align: 'right' });
            doc.text(`€ ${item.total.toFixed(2)}`, totalX, y, { width: 90, align: 'right' });

            y += Math.max(descHeight, 15) + 10;
        });

        doc.moveDown();
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
        y += 15;

        // --- TOTALS SECTION ---
        const totalsX = 350;
        const valuesX = 450;

        doc.font('Helvetica').fontSize(10);

        // Subtotal
        doc.text('Imponibile:', totalsX, y, { width: 90, align: 'right' });
        doc.text(`€ ${quote.subtotal.toFixed(2)}`, valuesX, y, { width: 90, align: 'right' });
        y += 15;

        // Safety Costs (if any)
        if (quote.safetyCosts > 0) {
            doc.text('Oneri Sicurezza:', totalsX, y, { width: 90, align: 'right' });
            doc.text(`€ ${quote.safetyCosts.toFixed(2)}`, valuesX, y, { width: 90, align: 'right' });
            doc.fontSize(8).fillColor('#64748B').text('(non soggetti a ribasso)', totalsX, y + 10, { width: 90, align: 'right' });
            doc.fontSize(10).fillColor('#334155');
            y += 25;
        }

        // VAT
        if (quote.vatRate === 0) {
            doc.text('IVA (Esente):', totalsX, y, { width: 90, align: 'right' });
            doc.text('€ 0.00', valuesX, y, { width: 90, align: 'right' });
        } else {
            doc.text(`IVA (${quote.vatRate}%):`, totalsX, y, { width: 90, align: 'right' });
            doc.text(`€ ${quote.vatAmount.toFixed(2)}`, valuesX, y, { width: 90, align: 'right' });
        }
        y += 20;

        // Grand Total
        doc.rect(totalsX, y - 5, 200, 25).fill('#F1F5F9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12);
        doc.text('TOTALE:', totalsX + 10, y + 2);
        doc.text(`€ ${quote.total.toFixed(2)}`, valuesX, y + 2, { width: 80, align: 'right' });

        y += 40;

        // --- CONTRACT TERMS ---
        doc.fillColor('#000000');
        if (y > 650) { doc.addPage(); y = 50; }

        doc.font('Helvetica-Bold').fontSize(10).text('CONDIZIONI DI FORNITURA', 50, y);
        y += 15;
        doc.font('Helvetica').fontSize(9);

        if (quote.paymentTerms) {
            doc.text(`• Pagamento: ${quote.paymentTerms}`, 50, y);
            y += 12;
        }
        if (quote.workDuration) {
            doc.text(`• Tempi di esecuzione: ${quote.workDuration}`, 50, y);
            y += 12;
        }
        if (quote.legalNotes) {
            doc.text(`• Note: ${quote.legalNotes}`, 50, y);
            y += 12;
        }

        // Bank Details Box
        if (company.iban) {
            y += 10;
            doc.rect(50, y, 250, 50).stroke('#CBD5E1');
            doc.font('Helvetica-Bold').fontSize(9).text('Coordinate Bancarie per il pagamento:', 60, y + 10);
            doc.font('Helvetica').fontSize(9);
            if (company.bankName) doc.text(company.bankName, 60, y + 25);
            doc.text(`IBAN: ${company.iban}`, 60, y + 38);
        }

        // --- FOOTER & SIGNATURES ---
        const footerY = 700; // Fixed position near bottom
        if (doc.y > footerY - 100) doc.addPage();

        // Privacy
        doc.fontSize(7).fillColor('#64748B');
        doc.text('I dati personali sono trattati secondo il Regolamento UE 2016/679 (GDPR) esclusivamente per l\'esecuzione del contratto.', 50, footerY - 100, { width: 500, align: 'center' });

        // Signatures
        const sigY = footerY - 60;
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');

        // Company Signature
        doc.text('Il Fornitore', 50, sigY);
        if (user && user.signature) {
            try {
                const base64Data = user.signature.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                doc.image(buffer, 50, sigY + 15, { width: 100 });
            } catch (e) { console.error(e); }
        }

        // Client Signature (Double)
        doc.text('Il Cliente (per accettazione)', 350, sigY);
        doc.text('_______________________', 350, sigY + 40);

        doc.text('Il Cliente (approvazione clausole)', 350, sigY + 70);
        doc.fontSize(7).font('Helvetica').text('(Ai sensi degli artt. 1341 e 1342 c.c.)', 350, sigY + 82);
        doc.text('_______________________', 350, sigY + 100);

        doc.end();
    });
};

const generateQuotePDF = async (quote, company, user, res) => {
    try {
        const buffer = await generateQuotePDFBuffer(quote, company, user);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=preventivo-${quote.number}.pdf`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
};

const generateSALPDFBuffer = (sal, company, site) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- HEADER (Carta Intestata) ---
        let headerY = 45;

        // Logo (Left)
        if (company.logo) {
            try {
                if (company.logo.startsWith('data:image')) {
                    const base64Data = company.logo.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    doc.image(buffer, 50, headerY, { width: 80 });
                } else {
                    let logoPath = company.logo;
                    if (logoPath.startsWith('/')) logoPath = logoPath.substring(1);
                    const absolutePath = path.join(__dirname, '..', logoPath);
                    if (fs.existsSync(absolutePath)) {
                        doc.image(absolutePath, 50, headerY, { width: 80 });
                    }
                }
            } catch (e) {
                console.error('Error loading logo:', e);
            }
        }

        // Company Details (Right)
        doc.font('Helvetica-Bold').fontSize(16).text(company.name, 200, headerY, { align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor('#444444');

        let detailsY = headerY + 25;
        const addDetail = (text) => {
            if (text) {
                doc.text(text, 200, detailsY, { align: 'right' });
                detailsY += 12;
            }
        };

        addDetail(company.address?.street);
        addDetail(`${company.address?.cap || ''} ${company.address?.city || ''} (${company.address?.province || ''})`);
        addDetail(`P.IVA: ${company.piva || '-'}`);
        if (company.pec) addDetail(`PEC: ${company.pec}`);
        if (company.phone) addDetail(`Tel: ${company.phone}`);

        // Separator
        doc.moveDown(2);
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(2);

        // --- DOCUMENT TITLE ---
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(20).text('STATO AVANZAMENTO LAVORI', 50, doc.y, { align: 'center' });
        doc.moveDown(1.5);

        // --- DOCUMENT INFO ---
        const startY = doc.y;

        // Left Column: Client Info
        doc.font('Helvetica-Bold').fontSize(11).text('Committente:', 50, startY);
        doc.font('Helvetica').fontSize(10);
        doc.text(sal.client.name, 50, startY + 15);
        if (sal.client.address) doc.text(sal.client.address, 50, startY + 30);
        if (sal.client.vatNumber) doc.text(`P.IVA/C.F.: ${sal.client.vatNumber}`, 50, startY + 45);

        // Right Column: SAL Info
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`SAL N.: ${sal.number}`, 350, startY, { align: 'right' });
        doc.font('Helvetica').fontSize(10);
        doc.text(`Data Emissione: ${new Date(sal.date).toLocaleDateString('it-IT')}`, 350, startY + 15, { align: 'right' });
        doc.text(`Periodo: ${new Date(sal.periodStart).toLocaleDateString('it-IT')} - ${new Date(sal.periodEnd).toLocaleDateString('it-IT')}`, 350, startY + 30, { align: 'right' });
        doc.text(`Completamento: ${sal.completionPercentage}%`, 350, startY + 45, { align: 'right' });

        doc.moveDown(4);

        // --- CANTIERE SECTION ---
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Cantiere', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        doc.text(`Nome: ${site.name}`, 50, doc.y);
        doc.text(`Indirizzo: ${site.address || 'N/D'}`, 50, doc.y + 15);
        if (sal.cig) doc.text(`CIG: ${sal.cig}`, 50, doc.y + 30);
        if (sal.cup) doc.text(`CUP: ${sal.cup}`, 50, doc.y + 45);

        doc.moveDown(3);

        // --- DESCRIZIONE LAVORI ---
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text('Descrizione Lavori Eseguiti', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        doc.text(sal.workDescription, 50, doc.y, { width: 495, align: 'justify' });

        doc.moveDown(2);

        // --- FINANCIAL BREAKDOWN ---
        const financeY = doc.y;

        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, financeY).lineTo(545, financeY).stroke();

        const rowHeight = 20;
        let currentY = financeY + 10;

        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B');

        const addFinanceLine = (label, value, bold = false) => {
            if (bold) {
                doc.font('Helvetica-Bold').fontSize(11);
            } else {
                doc.font('Helvetica').fontSize(10);
            }
            doc.fillColor('#334155').text(label, 50, currentY);
            doc.fillColor('#334155').text(`€ ${value.toFixed(2)}`, 400, currentY, { align: 'right', width: 145 });
            currentY += rowHeight;
        };

        addFinanceLine('Valore Contratto', sal.contractValue);
        addFinanceLine('Importo Lavori SAL Precedenti', sal.previousAmount);
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, currentY - 5).lineTo(545, currentY - 5).stroke();
        addFinanceLine('Importo Lavori Questo SAL', sal.currentAmount, true);
        addFinanceLine('Ritenuta di Garanzia (10%)', sal.retentionAmount);
        if (sal.penalties > 0) {
            addFinanceLine('Penali', sal.penalties);
        }
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, currentY - 5).lineTo(545, currentY - 5).stroke();
        addFinanceLine('Imponibile', sal.netAmount, true);
        addFinanceLine(`IVA (${sal.vatRate}%)`, sal.vatAmount);

        // Grand Total
        doc.rect(50, currentY - 5, 495, 30).fill('#F1F5F9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14);
        doc.text('TOTALE DOVUTO', 60, currentY + 3);
        doc.text(`€ ${sal.totalAmount.toFixed(2)}`, 400, currentY + 3, { align: 'right', width: 135 });

        currentY += 40;

        // --- WORK SUPERVISOR (if present) ---
        if (sal.workSupervisor && sal.workSupervisor.name) {
            doc.moveDown(2);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text('Direttore Lavori', 50, doc.y);
            doc.font('Helvetica').fontSize(10).fillColor('#334155');
            doc.text(sal.workSupervisor.name, 50, doc.y + 15);
            if (sal.workSupervisor.qualification) {
                doc.text(sal.workSupervisor.qualification, 50, doc.y + 28);
            }
        }

        // --- NOTES (if present) ---
        if (sal.notes) {
            doc.moveDown(2);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text('Note', 50, doc.y);
            doc.font('Helvetica').fontSize(9).fillColor('#334155');
            doc.text(sal.notes, 50, doc.y + 15, { width: 495 });
        }

        // --- FOOTER & SIGNATURES ---
        const footerY = 700;
        if (doc.y > footerY - 100) doc.addPage();

        // Privacy
        doc.fontSize(7).fillColor('#64748B');
        doc.text('I dati personali sono trattati secondo il Regolamento UE 2016/679 (GDPR) esclusivamente per l\'esecuzione del contratto.', 50, footerY - 80, { width: 500, align: 'center' });

        // Signatures
        const sigY = footerY - 50;
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');

        // Left: Contractor Signature
        doc.text('L\'Appaltatore', 50, sigY);
        doc.text('_______________________', 50, sigY + 40);

        // Center: Work Supervisor
        if (sal.workSupervisor && sal.workSupervisor.name) {
            doc.text('Il Direttore Lavori', 230, sigY);
            doc.text('_______________________', 230, sigY + 40);
        }

        // Right: Client Approval
        doc.text('Il Committente', 410, sigY);
        doc.fontSize(7).font('Helvetica').text('(per accettazione)', 410, sigY + 12);
        doc.text('_______________________', 410, sigY + 40);

        doc.end();
    });
};

const generateSALPDF = async (sal, company, site, res) => {
    try {
        const buffer = await generateSALPDFBuffer(sal, company, site);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sal-${sal.number}.pdf`);
        res.send(buffer);
    } catch (error) {
        console.error('Error generating SAL PDF:', error);
        res.status(500).send('Error generating PDF');
    }
};

module.exports = { generateQuotePDF, generateQuotePDFBuffer, generateSALPDF, generateSALPDFBuffer };
