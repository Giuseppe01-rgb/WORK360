const { SAL, ConstructionSite, Company } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { sanitizeAllDates } = require('../utils/dateValidator');
const { generateSALPDF } = require('../utils/pdfGenerator');


// Create new SAL
exports.createSAL = async (req, res) => {
    try {
        console.log('CREATE SAL - Request body:', JSON.stringify(req.body, null, 2));
        console.log('CREATE SAL - User:', getUserId(req));

        const { site, date, periodStart, periodEnd, client, contractValue, previousAmount, currentAmount, penalties, notes } = req.body;

        // Validate required fields
        if (!site) {
            return res.status(400).json({ message: 'Campo cantiere obbligatorio' });
        }
        if (!date) {
            return res.status(400).json({ message: 'Campo data obbligatorio' });
        }
        if (!periodStart || !periodEnd) {
            return res.status(400).json({ message: 'Periodo lavori obbligatorio' });
        }
        if (!client || !client.name || !client.vatNumber || !client.address) {
            return res.status(400).json({ message: 'Dati committente obbligatori (nome, P.IVA, indirizzo)' });
        }
        if (!contractValue || contractValue <= 0) {
            return res.status(400).json({ message: 'Valore contratto obbligatorio' });
        }

        // Calculate completion percentage
        const totalSpent = (previousAmount || 0) + (currentAmount || 0);
        const completionPercentage = Math.min(100, Math.max(0, (totalSpent / contractValue) * 100));

        // Generate SAL number
        const year = new Date().getFullYear();
        const count = await SAL.count({ where: { ownerId: getUserId(req) } });
        const number = `SAL-${year}-${String(count + 1).padStart(4, '0')}`;

        console.log('CREATE SAL - Generated number:', number);

        // Sanitize dates
        const salData = sanitizeAllDates({
            ownerId: getUserId(req),
            siteId: site,
            number,
            date,
            periodStart,
            periodEnd,
            client,
            contractValue,
            previousAmount: previousAmount || 0,
            currentAmount: currentAmount || 0,
            completionPercentage: Math.round(completionPercentage * 100) / 100,
            penalties: penalties || 0,
            notes: notes || ''
        });

        console.log('CREATE SAL - About to save:', JSON.stringify(salData, null, 2));

        const sal = await SAL.create(salData);

        // Reload with associations
        await sal.reload({
            include: [{ model: ConstructionSite, as: 'site' }]
        });

        console.log('CREATE SAL - Success!');
        res.status(201).json(sal);
    } catch (error) {
        console.error('CREATE SAL - Error:', error);
        console.error('CREATE SAL - Error message:', error.message);
        console.error('CREATE SAL - Error stack:', error.stack);
        res.status(500).json({ message: 'Errore nella creazione del SAL', error: error.message });
    }
};

// Get all SALs for owner
exports.getAllSALs = async (req, res) => {
    try {
        const sals = await SAL.findAll({
            where: { ownerId: getUserId(req) },
            include: [{ model: ConstructionSite, as: 'site' }],
            order: [['date', 'DESC']]
        });

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
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            },
            include: [{ model: ConstructionSite, as: 'site' }]
        });

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
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            }
        });

        if (!sal) {
            return res.status(404).json({ message: 'SAL non trovato' });
        }

        // Recalculate completion percentage
        const totalSpent = previousAmount + currentAmount;
        const completionPercentage = Math.min(100, Math.max(0, (totalSpent / contractValue) * 100));

        // Build update data
        const updateData = {};
        if (site) updateData.siteId = site;
        if (date) updateData.date = date;
        if (periodStart) updateData.periodStart = periodStart;
        if (periodEnd) updateData.periodEnd = periodEnd;
        if (client) updateData.client = client;
        if (contractValue !== undefined) updateData.contractValue = contractValue;
        if (previousAmount !== undefined) updateData.previousAmount = previousAmount;
        if (currentAmount !== undefined) updateData.currentAmount = currentAmount;
        if (penalties !== undefined) updateData.penalties = penalties;
        if (notes !== undefined) updateData.notes = notes;
        updateData.completionPercentage = Math.round(completionPercentage * 100) / 100;

        // Sanitize dates
        const sanitizedUpdate = sanitizeAllDates(updateData);

        await sal.update(sanitizedUpdate);

        // Reload with associations
        await sal.reload({
            include: [{ model: ConstructionSite, as: 'site' }]
        });

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
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            }
        });

        if (!sal) {
            return res.status(404).json({ message: 'SAL non trovato' });
        }

        await sal.destroy();
        res.json({ message: 'SAL eliminato con successo' });
    } catch (error) {
        console.error('Error deleting SAL:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del SAL', error: error.message });
    }
};

// Download SAL PDF
exports.downloadSALPDF = async (req, res) => {
    try {
        console.log('DOWNLOAD SAL PDF - Request for ID:', req.params.id);
        console.log('DOWNLOAD SAL PDF - User:', getUserId(req));
        console.log('DOWNLOAD SAL PDF - User Company ID:', getCompanyId(req));

        const sal = await SAL.findOne({
            where: {
                id: req.params.id,
                ownerId: getUserId(req)
            },
            include: [{ model: ConstructionSite, as: 'site' }]
        });

        if (!sal) {
            console.error('DOWNLOAD SAL PDF - SAL not found');
            return res.status(404).json({ message: 'SAL non trovato' });
        }
        console.log('DOWNLOAD SAL PDF - SAL found:', sal.number);

        // Get company details
        const companyId = getCompanyId(req);
        if (!companyId) {
            console.error('DOWNLOAD SAL PDF - User has no company assigned');
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const company = await Company.findByPk(companyId);

        if (!company) {
            console.error('DOWNLOAD SAL PDF - Company not found for ID:', companyId);
            return res.status(404).json({ message: 'Dati azienda non trovati. Configura prima la tua azienda.' });
        }
        console.log('DOWNLOAD SAL PDF - Company found:', company.name);

        // Generate PDF
        console.log('DOWNLOAD SAL PDF - Generating PDF...');
        await generateSALPDF(sal, company, sal.site, res);
        console.log('DOWNLOAD SAL PDF - PDF sent successfully');
    } catch (error) {
        console.error('Error downloading SAL PDF:', error);
        console.error('Error stack:', error.stack);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Errore nel download del PDF', error: error.message });
        }
    }
};
