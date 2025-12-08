const { MaterialMaster, User } = require('../models');
const { parseExcelFile, mapRowToMaterial, validateMaterial } = require('../utils/excelParser');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

// Get user's company ID helper
const getCompanyId = (req) => {
    return req.user.companyId || req.user.company?.id;
};

// Get ALL materials for user's company
const getAllMaterials = async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const materials = await MaterialMaster.findAll({
            where: { companyId },
            order: [['family', 'ASC'], ['displayName', 'ASC']]
        });

        // Map to expected frontend format
        const formatted = materials.map(m => ({
            _id: m.id,
            codice_prodotto: m.barcode || '',
            marca: m.spec || '',
            nome_prodotto: m.displayName,
            quantita: m.unit,
            prezzo: m.price ? parseFloat(m.price) : null,
            fornitore: m.supplier || '',
            categoria: m.family,
            attivo: true
        }));

        res.json(formatted);
    } catch (error) {
        console.error('getAllMaterials error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Search materials by query
const searchMaterials = async (req, res) => {
    try {
        const { q } = req.query;
        const companyId = getCompanyId(req);

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const materials = await MaterialMaster.findAll({
            where: {
                companyId,
                [require('sequelize').Op.or]: [
                    { displayName: { [require('sequelize').Op.iLike]: `%${q}%` } },
                    { barcode: { [require('sequelize').Op.iLike]: `%${q}%` } },
                    { spec: { [require('sequelize').Op.iLike]: `%${q}%` } }
                ]
            },
            limit: 20,
            order: [['displayName', 'ASC']]
        });

        // Map to frontend format
        const formatted = materials.map(m => ({
            _id: m.id,
            codice_prodotto: m.barcode || '',
            marca: m.spec || '',
            nome_prodotto: m.displayName,
            quantita: m.unit,
            prezzo: m.price ? parseFloat(m.price) : null,
            fornitore: m.supplier || '',
            categoria: m.family,
            attivo: true
        }));

        res.json(formatted);
    } catch (error) {
        console.error('searchMaterials error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get single material by barcode/code
const getMaterialByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const companyId = getCompanyId(req);

        const material = await MaterialMaster.findOne({
            where: { companyId, barcode: code }
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato', found: false });
        }

        res.json({
            found: true,
            material: {
                _id: material.id,
                codice_prodotto: material.barcode || '',
                marca: material.spec || '',
                nome_prodotto: material.displayName,
                quantita: material.unit,
                prezzo: material.price ? parseFloat(material.price) : null,
                fornitore: material.supplier || '',
                categoria: material.family,
                attivo: true
            }
        });
    } catch (error) {
        console.error('getMaterialByCode error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Create a new material
const createMaterial = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user.id;
        const { codice_prodotto, marca, nome_prodotto, quantita, prezzo, fornitore, categoria } = req.body;

        if (!nome_prodotto) {
            return res.status(400).json({ message: 'Nome prodotto obbligatorio' });
        }

        const displayName = nome_prodotto;
        const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);

        const material = await MaterialMaster.create({
            companyId,
            family: categoria || 'Altro',
            spec: marca || '',
            unit: quantita || 'pz',
            displayName,
            normalizedKey,
            supplier: fornitore || '',
            barcode: codice_prodotto || '',
            price: prezzo || null,
            createdById: userId
        });

        res.status(201).json({
            _id: material.id,
            codice_prodotto: material.barcode,
            marca: material.spec,
            nome_prodotto: material.displayName,
            quantita: material.unit,
            prezzo: material.price ? parseFloat(material.price) : null,
            fornitore: material.supplier,
            categoria: material.family,
            attivo: true
        });
    } catch (error) {
        console.error('createMaterial error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Materiale con questo nome già esistente' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Update an existing material
const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);
        const { codice_prodotto, marca, nome_prodotto, quantita, prezzo, fornitore, categoria } = req.body;

        const material = await MaterialMaster.findOne({
            where: { id, companyId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        if (nome_prodotto) {
            material.displayName = nome_prodotto;
            material.normalizedKey = nome_prodotto.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);
        }
        if (categoria !== undefined) material.family = categoria || 'Altro';
        if (marca !== undefined) material.spec = marca || '';
        if (quantita !== undefined) material.unit = quantita || 'pz';
        if (fornitore !== undefined) material.supplier = fornitore || '';
        if (codice_prodotto !== undefined) material.barcode = codice_prodotto || '';
        if (prezzo !== undefined) material.price = prezzo || null;

        await material.save();

        res.json({
            _id: material.id,
            codice_prodotto: material.barcode,
            marca: material.spec,
            nome_prodotto: material.displayName,
            quantita: material.unit,
            prezzo: material.price ? parseFloat(material.price) : null,
            fornitore: material.supplier,
            categoria: material.family,
            attivo: true
        });
    } catch (error) {
        console.error('updateMaterial error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete a material
const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);

        const material = await MaterialMaster.findOne({
            where: { id, companyId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        await material.destroy();
        res.json({ message: 'Materiale eliminato con successo' });
    } catch (error) {
        console.error('deleteMaterial error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete ALL materials for company
const deleteAllMaterials = async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        const count = await MaterialMaster.destroy({
            where: { companyId }
        });

        res.json({ message: `${count} materiali eliminati con successo`, deleted: count });
    } catch (error) {
        console.error('deleteAllMaterials error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Import from Excel/CSV
const importFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        const companyId = getCompanyId(req);
        const userId = req.user.id;

        // Parse Excel file
        const rows = parseExcelFile(req.file.buffer);
        console.log(`Parsed ${rows.length} rows from Excel`);

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Il file è vuoto o non contiene dati validi' });
        }

        const results = {
            total: rows.length,
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        for (let i = 0; i < rows.length; i++) {
            try {
                const mapped = mapRowToMaterial(rows[i]);
                const validationErrors = validateMaterial(mapped, i);

                if (validationErrors.length > 0) {
                    results.errors.push(...validationErrors);
                    results.skipped++;
                    continue;
                }

                const displayName = mapped.nome_prodotto;
                const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);

                // Check if already exists
                const existing = await MaterialMaster.findOne({
                    where: { companyId, normalizedKey }
                });

                if (existing) {
                    // Update existing
                    existing.spec = mapped.marca || existing.spec;
                    existing.family = mapped.categoria || existing.family;
                    existing.unit = mapped.quantita || existing.unit;
                    existing.supplier = mapped.fornitore || existing.supplier;
                    existing.barcode = mapped.codice_prodotto || existing.barcode;
                    if (mapped.prezzo) existing.price = mapped.prezzo;
                    await existing.save();
                    results.updated++;
                } else {
                    // Create new
                    await MaterialMaster.create({
                        companyId,
                        family: mapped.categoria || 'Altro',
                        spec: mapped.marca || '',
                        unit: mapped.quantita || 'pz',
                        displayName,
                        normalizedKey,
                        supplier: mapped.fornitore || '',
                        barcode: mapped.codice_prodotto || '',
                        price: mapped.prezzo || null,
                        createdById: userId
                    });
                    results.imported++;
                }
            } catch (rowError) {
                results.errors.push(`Riga ${i + 2}: ${rowError.message}`);
                results.skipped++;
            }
        }

        res.json({
            success: true,
            message: `Importazione completata: ${results.imported} nuovi, ${results.updated} aggiornati, ${results.skipped} saltati`,
            results
        });
    } catch (error) {
        console.error('importFromExcel error:', error);
        res.status(500).json({ message: `Errore durante l'importazione: ${error.message}` });
    }
};

module.exports = {
    getAllMaterials,
    searchMaterials,
    getMaterialByCode,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    deleteAllMaterials,
    importFromExcel
};
