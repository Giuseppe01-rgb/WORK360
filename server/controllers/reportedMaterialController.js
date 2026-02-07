const { ReportedMaterial, MaterialMaster, User, ConstructionSite } = require('../models');
const { sequelize } = require('../config/database');

// Get user's company ID helper
const getCompanyId = (req) => {
    return req.user.companyId || req.user.company?.id;
};

// Get all reported materials for company (owner view)
const getReportedMaterials = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const { stato, siteId } = req.query;

        const where = { companyId };
        if (stato) where.stato = stato;
        if (siteId) where.siteId = siteId;

        const materials = await ReportedMaterial.findAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: ConstructionSite, as: 'site', attributes: ['id', 'name'] }
            ],
            order: [['dataOra', 'DESC']]
        });

        res.json(materials);
    } catch (error) {
        console.error('getReportedMaterials error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Report a new material (worker action)
const reportNewMaterial = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user.id;
        const { siteId, fotoUrl, codiceLetto, nomeDigitato, categoriaDigitata, numeroConfezioni } = req.body;

        if (!siteId || !fotoUrl || !nomeDigitato || !numeroConfezioni) {
            return res.status(400).json({ message: 'Campi obbligatori mancanti: siteId, fotoUrl, nomeDigitato, numeroConfezioni' });
        }

        // Validate site belongs to company
        const site = await ConstructionSite.findOne({
            where: { id: siteId, companyId }
        });

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        const reported = await ReportedMaterial.create({
            companyId,
            siteId,
            userId,
            fotoUrl,
            codiceLetto: codiceLetto || '',
            nomeDigitato,
            categoriaDigitata: categoriaDigitata || 'Altro',
            numeroConfezioni,
            stato: 'da_approvare'
        });

        res.status(201).json(reported);
    } catch (error) {
        console.error('reportNewMaterial error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Approve and create new material in catalog (owner action)
const approveAndCreateNew = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const approverId = req.user.id;
        const { id } = req.params;
        const { family, spec, unit, displayName, supplier, barcode, price, noteApprovazione } = req.body;

        // Find the reported material
        const reported = await ReportedMaterial.findOne({
            where: { id, companyId, stato: 'da_approvare' }
        });

        if (!reported) {
            return res.status(404).json({ message: 'Materiale segnalato non trovato o già processato' });
        }

        // Create new material in catalog
        const materialName = displayName || reported.nomeDigitato;
        const normalizedKey = materialName.toLowerCase().replaceAll(/[^a-z0-9]/g, '').substring(0, 100);

        const newMaterial = await MaterialMaster.create({
            companyId,
            family: family || reported.categoriaDigitata || 'Altro',
            spec: spec || '',
            unit: unit || 'pz',
            displayName: materialName,
            normalizedKey,
            supplier: supplier || '',
            barcode: barcode || reported.codiceLetto || '',
            price: price || null,
            createdById: approverId
        });

        // Update reported material
        await reported.update({
            stato: 'approvato',
            materialeIdDefinitivo: newMaterial.id,
            noteApprovazione: noteApprovazione || '',
            approvatoDa: approverId
        });

        res.json({
            message: 'Materiale approvato e aggiunto al catalogo',
            reported,
            newMaterial
        });
    } catch (error) {
        console.error('approveAndCreateNew error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Un materiale con questo nome esiste già nel catalogo' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Approve and associate to existing material (owner action)
const approveAndAssociate = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const approverId = req.user.id;
        const { id } = req.params;
        const { materialeIdDefinitivo, noteApprovazione } = req.body;

        if (!materialeIdDefinitivo) {
            return res.status(400).json({ message: 'materialeIdDefinitivo obbligatorio' });
        }

        // Find the reported material
        const reported = await ReportedMaterial.findOne({
            where: { id, companyId, stato: 'da_approvare' }
        });

        if (!reported) {
            return res.status(404).json({ message: 'Materiale segnalato non trovato o già processato' });
        }

        // Verify the catalog material exists
        const catalogMaterial = await MaterialMaster.findOne({
            where: { id: materialeIdDefinitivo, companyId }
        });

        if (!catalogMaterial) {
            return res.status(404).json({ message: 'Materiale del catalogo non trovato' });
        }

        // Update reported material
        await reported.update({
            stato: 'approvato',
            materialeIdDefinitivo,
            noteApprovazione: noteApprovazione || '',
            approvatoDa: approverId
        });

        res.json({
            message: 'Materiale approvato e associato al catalogo esistente',
            reported,
            associatedTo: catalogMaterial
        });
    } catch (error) {
        console.error('approveAndAssociate error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reject material (owner action)
const rejectMaterial = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const approverId = req.user.id;
        const { id } = req.params;
        const { noteApprovazione } = req.body;

        // Find the reported material
        const reported = await ReportedMaterial.findOne({
            where: { id, companyId, stato: 'da_approvare' }
        });

        if (!reported) {
            return res.status(404).json({ message: 'Materiale segnalato non trovato o già processato' });
        }

        // Update as rejected
        await reported.update({
            stato: 'rifiutato',
            noteApprovazione: noteApprovazione || '',
            approvatoDa: approverId
        });

        res.json({
            message: 'Materiale rifiutato',
            reported
        });
    } catch (error) {
        console.error('rejectMaterial error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getReportedMaterials,
    reportNewMaterial,
    approveAndCreateNew,
    approveAndAssociate,
    rejectMaterial
};
