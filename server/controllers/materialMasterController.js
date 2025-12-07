const MaterialMaster = require('../models/MaterialMaster');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { normalizeMaterialInput } = require('../utils/materialNormalization');
const { parseInvoiceWithOCR } = require('../utils/invoiceParser');

// Get all materials in catalog for a company
const getMaterialCatalog = async (req, res) => {
    try {
        const { filter } = req.query;
        const query = { company: getCompanyId(req) };

        const materials = await MaterialMaster.find(query)
            .populate('createdBy', 'firstName lastName')
            .sort({ displayName: 1 });

        // Apply filter if requested
        let filteredMaterials = materials;
        if (filter === 'missing-price') {
            filteredMaterials = materials.filter(m => m.missingPrice);
        }

        res.json(filteredMaterials);
    } catch (error) {
        console.error('Get Material Catalog Error:', error);
        res.status(500).json({ message: 'Errore nel recupero del catalogo materiali', error: error.message });
    }
};

// Get material by barcode
const getMaterialByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;

        if (!barcode) {
            return res.status(400).json({ message: 'Codice a barre richiesto' });
        }

        const material = await MaterialMaster.findOne({
            company: getCompanyId(req),
            barcode: barcode
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato', found: false });
        }

        res.json({ found: true, material });
    } catch (error) {
        console.error('Get Material by Barcode Error:', error);
        res.status(500).json({ message: 'Errore nella ricerca del materiale', error: error.message });
    }
};

// Create manual material catalog entry
const createMaterialCatalogEntry = async (req, res) => {
    try {
        const { displayName, supplier, unit, price, barcode } = req.body;

        if (!displayName || !unit) {
            return res.status(400).json({ message: 'Nome materiale e unità di misura sono obbligatori' });
        }

        // Normalize the material name to check for duplicates
        const normalized = normalizeMaterialInput(displayName, unit);

        if (!normalized) {
            return res.status(400).json({ message: 'Nome materiale non valido' });
        }

        // Check if material already exists
        const existing = await MaterialMaster.findOne({
            company: getCompanyId(req),
            normalizedKey: normalized.normalizedKey
        });

        if (existing) {
            // Update existing material
            existing.displayName = displayName;
            existing.supplier = supplier || '';
            existing.unit = normalized.unit;
            existing.price = price || null;
            await existing.save();

            return res.json(existing);
        }

        // Create new material
        const material = await MaterialMaster.create({
            company: getCompanyId(req),
            ...normalized,
            displayName, // Use user's exact capitalization
            supplier: supplier || '',
            barcode: barcode || '',
            price: price || null,
            createdBy: getUserId(req)
        });

        res.status(201).json(material);
    } catch (error) {
        console.error('Create Material Catalog Entry Error:', error);
        res.status(500).json({ message: 'Errore nella creazione del materiale', error: error.message });
    }
};

// Update material catalog entry
const updateMaterialCatalogEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { displayName, supplier, unit, price, barcode } = req.body;

        const material = await MaterialMaster.findOne({
            _id: id,
            company: getCompanyId(req)
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        // If name or unit changed, update normalization
        if (displayName || unit) {
            const newName = displayName || material.displayName;
            const newUnit = unit || material.unit;
            const normalized = normalizeMaterialInput(newName, newUnit);

            // Check if new normalized key conflicts with another material
            if (normalized.normalizedKey !== material.normalizedKey) {
                const existing = await MaterialMaster.findOne({
                    company: getCompanyId(req),
                    normalizedKey: normalized.normalizedKey,
                    _id: { $ne: id }
                });

                if (existing) {
                    return res.status(400).json({
                        message: 'Esiste già un materiale con questo nome. Vuoi aggiornare quello esistente?'
                    });
                }

                material.family = normalized.family;
                material.spec = normalized.spec;
                material.normalizedKey = normalized.normalizedKey;
            }

            material.displayName = newName;
            material.unit = newUnit;
        }

        if (supplier !== undefined) material.supplier = supplier;
        if (price !== undefined) material.price = price;
        if (barcode !== undefined) material.barcode = barcode;

        await material.save();
        res.json(material);
    } catch (error) {
        console.error('Update Material Catalog Entry Error:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del materiale', error: error.message });
    }
};

// Delete material catalog entry
const deleteMaterialCatalogEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const material = await MaterialMaster.findOneAndDelete({
            _id: id,
            company: getCompanyId(req)
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        res.json({ message: 'Materiale eliminato con successo' });
    } catch (error) {
        console.error('Delete Material Catalog Entry Error:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del materiale', error: error.message });
    }
};

// Upload and parse invoice with OCR
const uploadInvoice = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        const { buffer, mimetype, originalname, size } = req.file;

        // Validate file size (max 10MB)
        if (size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: 'File troppo grande. Massimo 10MB' });
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(mimetype)) {
            return res.status(400).json({ message: 'Formato file non supportato. Usa PDF, PNG o JPG' });
        }

        console.log(`Processing invoice: ${originalname} (${mimetype}, ${(size / 1024).toFixed(2)} KB)`);

        // Parse invoice with OCR
        const result = await parseInvoiceWithOCR(buffer, mimetype);

        if (!result.success) {
            return res.status(500).json({
                message: 'Errore nel parsing della fattura',
                error: result.error
            });
        }

        if (result.materials.length === 0) {
            return res.json({
                success: true,
                message: 'Nessun materiale trovato nella fattura. Prova con un\'immagine più chiara o aggiungi manualmente.',
                materials: [],
                rawText: result.rawText.substring(0, 500) // First 500 chars for debugging
            });
        }

        res.json({
            success: true,
            message: `${result.materials.length} materiali estratti dalla fattura`,
            materials: result.materials
        });

    } catch (error) {
        console.error('Upload Invoice Error:', error);
        res.status(500).json({ message: 'Errore nell\'upload della fattura', error: error.message });
    }
};

module.exports = {
    getMaterialCatalog,
    getMaterialByBarcode,
    createMaterialCatalogEntry,
    updateMaterialCatalogEntry,
    deleteMaterialCatalogEntry,
    uploadInvoice
};
