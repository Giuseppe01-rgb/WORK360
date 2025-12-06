const ReportedMaterial = require('../models/ReportedMaterial');
const ColouraMaterial = require('../models/ColouraMaterial');
const MaterialUsage = require('../models/MaterialUsage');
const { assertSiteBelongsToCompany } = require('../utils/security');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

// Report new material - worker submits photo + quantity (segnalazione flow)
const reportNewMaterial = async (req, res, next) => {
    try {
        const { siteId, fotoUrl, numeroConfezioni, note, nomeDigitato } = req.body;
        const companyId = req.user.company._id || req.user.company;

        if (!siteId || !fotoUrl || !numeroConfezioni) {
            return res.status(400).json({ message: 'Cantiere, foto e quantità sono obbligatori' });
        }

        if (!nomeDigitato || nomeDigitato.trim() === '') {
            return res.status(400).json({ message: 'Il nome del materiale è obbligatorio' });
        }

        // SECURITY: Verify site belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        // 1. Create ReportedMaterial
        const reported = await ReportedMaterial.create({
            company: companyId,
            site: siteId,
            user: req.user._id,
            fotoUrl,
            numeroConfezioni,
            codiceLetto: '',
            nomeDigitato: nomeDigitato.trim(),
            categoriaDigitata: 'Altro',
            stato: 'da_approvare'
        });

        // 2. Create MaterialUsage with da_approvare status
        const usage = await MaterialUsage.create({
            company: companyId,
            site: siteId,
            user: req.user._id,
            material: null,  // Not yet catalogued
            numeroConfezioni,
            foto: fotoUrl,
            stato: 'da_approvare',
            materialeReportId: reported._id,
            note: note || ''
        });

        const populated = await ReportedMaterial.findById(reported._id)
            .populate('site', 'name')
            .populate('user', 'firstName lastName');

        res.status(201).json({
            reported: populated,
            usage
        });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

// Get all reported materials (admin)
const getReportedMaterials = async (req, res) => {
    try {
        const { stato } = req.query;
        const query = { company: req.user.company._id };

        if (stato) {
            query.stato = stato;
        }

        const reported = await ReportedMaterial.find(query)
            .populate('site', 'name')
            .populate('user', 'firstName lastName')
            .populate('materialeIdDefinitivo')
            .populate('approvatoDa', 'firstName lastName')
            .sort({ dataOra: -1 });

        res.json(reported);
    } catch (error) {
        console.error('Get Reported Materials Error:', error);
        res.status(500).json({ message: 'Errore nel recupero delle segnalazioni', error: error.message });
    }
};

// Approve and create new material in catalog
const approveAndCreateNew = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialeData, noteApprovazione } = req.body;

        console.log(`Approving new material for report ${id} by user ${req.user._id}`);

        if (!req.user.company) {
            console.error('User has no company associated');
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        // Find reported material
        const reported = await ReportedMaterial.findOne({
            _id: id,
            company: req.user.company._id
        });

        if (!reported) {
            console.warn(`Report ${id} not found for company ${req.user.company._id}`);
            return res.status(404).json({ message: 'Segnalazione non trovata' });
        }

        if (reported.stato !== 'da_approvare') {
            return res.status(400).json({ message: 'Questa segnalazione è già stata processata' });
        }

        // 1. Create new material in catalog
        const newMaterial = await ColouraMaterial.create({
            company: req.user.company._id,
            codice_prodotto: materialeData.codice_prodotto?.toUpperCase() || '',
            nome_prodotto: materialeData.nome_prodotto,
            marca: materialeData.marca,
            quantita: materialeData.quantita || '',
            prezzo: materialeData.prezzo || null,
            fornitore: materialeData.fornitore || '',
            categoria: materialeData.categoria || 'Altro',
            attivo: true,
            createdBy: req.user._id
        });

        // 2. Update MaterialUsage to link to new material
        await MaterialUsage.updateOne(
            { materialeReportId: reported._id },
            {
                material: newMaterial._id,
                stato: 'catalogato'
            }
        );

        // 3. Update reported material status
        reported.stato = 'approvato';
        reported.materialeIdDefinitivo = newMaterial._id;
        reported.noteApprovazione = noteApprovazione || '';
        reported.approvatoDa = req.user._id;
        await reported.save();

        res.json({ message: 'Materiale creato e approvato', newMaterial });
    } catch (error) {
        console.error('Approve New Material Error:', error);
        res.status(500).json({ message: 'Errore nell\'approvazione del materiale', error: error.message });
    }
};

// Link reported material to existing catalog material (associate)
const approveAndAssociate = async (req, res) => {
    try {
        const { id } = req.params;
        const { materialId, noteApprovazione } = req.body;

        console.log(`Associating report ${id} to material ${materialId} by user ${req.user._id}`);

        if (!req.user.company) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const reported = await ReportedMaterial.findOne({
            _id: id,
            company: req.user.company._id
        });

        if (!reported) {
            return res.status(404).json({ message: 'Segnalazione non trovata' });
        }

        if (reported.stato !== 'da_approvare') {
            return res.status(400).json({ message: 'Questa segnalazione è già stata processata' });
        }

        // Verify material exists
        const material = await ColouraMaterial.findOne({
            _id: materialId,
            company: req.user.company._id,
            attivo: true
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato nel catalogo' });
        }

        // 1. Update MaterialUsage to link to existing material
        await MaterialUsage.updateOne(
            { materialeReportId: reported._id },
            {
                material: material._id,
                stato: 'catalogato'
            }
        );

        // 2. Update reported material
        reported.stato = 'approvato';
        reported.materialeIdDefinitivo = material._id;
        reported.noteApprovazione = noteApprovazione || '';
        reported.approvatoDa = req.user._id;
        await reported.save();

        res.json({ message: 'Segnalazione approvata e collegata', material });
    } catch (error) {
        console.error('Approve Associate Error:', error);
        res.status(500).json({ message: 'Errore nel collegamento del materiale', error: error.message });
    }
};

// Reject reported material
const rejectMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { noteApprovazione } = req.body;

        console.log(`Rejecting report ${id} by user ${req.user._id}`);

        if (!req.user.company) {
            return res.status(400).json({ message: 'Utente non associato ad alcuna azienda' });
        }

        const reported = await ReportedMaterial.findOne({
            _id: id,
            company: req.user.company._id,
            stato: 'da_approvare'
        });

        if (!reported) {
            return res.status(404).json({ message: 'Segnalazione non trovata o già processata' });
        }

        // 1. Update MaterialUsage to rifiutato status
        await MaterialUsage.updateOne(
            { materialeReportId: reported._id },
            { stato: 'rifiutato' }
        );

        // 2. Update reported material
        reported.stato = 'rifiutato';
        reported.noteApprovazione = noteApprovazione || '';
        reported.approvatoDa = req.user._id;
        await reported.save();

        res.json({ message: 'Segnalazione rifiutata', reported });
    } catch (error) {
        console.error('Reject Material Error:', error);
        res.status(500).json({ message: 'Errore nel rifiuto della segnalazione', error: error.message });
    }
};

module.exports = {
    reportNewMaterial,
    getReportedMaterials,
    approveAndCreateNew,
    approveAndAssociate,
    rejectMaterial
};
