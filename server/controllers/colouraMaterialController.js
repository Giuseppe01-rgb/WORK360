const ColouraMaterial = require('../models/ColouraMaterial');

// Get all materials
const getAllMaterials = async (req, res) => {
    try {
        const { attivo, categoria } = req.query;
        const query = { company: req.user.company._id };

        if (attivo !== undefined) {
            query.attivo = attivo === 'true';
        }

        if (categoria) {
            query.categoria = categoria;
        }

        const materials = await ColouraMaterial.find(query)
            .populate('createdBy', 'firstName lastName')
            .sort({ nome_prodotto: 1 });

        res.json(materials);
    } catch (error) {
        console.error('Get Materials Error:', error);
        res.status(500).json({ message: 'Errore nel recupero dei materiali', error: error.message });
    }
};

// Search materials
const searchMaterials = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Query di ricerca richiesta' });
        }

        const query = {
            company: req.user.company._id,
            attivo: true,
            $or: [
                { codice_prodotto: { $regex: q, $options: 'i' } },
                { nome_prodotto: { $regex: q, $options: 'i' } },
                { marca: { $regex: q, $options: 'i' } }
            ]
        };

        const materials = await ColouraMaterial.find(query)
            .limit(20)
            .sort({ nome_prodotto: 1 });

        res.json(materials);
    } catch (error) {
        console.error('Search Materials Error:', error);
        res.status(500).json({ message: 'Errore nella ricerca', error: error.message });
    }
};

// Get material by product code
const getMaterialByCode = async (req, res) => {
    try {
        const { code } = req.params;

        const material = await ColouraMaterial.findOne({
            company: req.user.company._id,
            codice_prodotto: code.toUpperCase(),
            attivo: true
        });

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato', found: false });
        }

        res.json({ found: true, material });
    } catch (error) {
        console.error('Get Material by Code Error:', error);
        res.status(500).json({ message: 'Errore nella ricerca del materiale', error: error.message });
    }
};

// Create material
const createMaterial = async (req, res) => {
    try {
        const { codice_prodotto, nome_prodotto, marca, quantita, prezzo, fornitore, categoria } = req.body;

        if (!nome_prodotto || !marca) {
            return res.status(400).json({ message: 'Nome prodotto e Marca sono obbligatori' });
        }

        // Check if code already exists
        if (codice_prodotto) {
            const existing = await ColouraMaterial.findOne({
                company: req.user.company._id,
                codice_prodotto: codice_prodotto.toUpperCase()
            });

            if (existing) {
                return res.status(400).json({ message: 'Codice prodotto già esistente' });
            }
        }

        const material = await ColouraMaterial.create({
            company: req.user.company._id,
            codice_prodotto: codice_prodotto ? codice_prodotto.toUpperCase() : '',
            nome_prodotto,
            marca,
            quantita: quantita || '',
            prezzo: prezzo || null,
            fornitore: fornitore || '',
            categoria: categoria || 'Altro',
            attivo: true,
            createdBy: req.user._id
        });

        res.status(201).json(material);
    } catch (error) {
        console.error('Create Material Error:', error);
        res.status(500).json({ message: 'Errore nella creazione del materiale', error: error.message });
    }
};

// Update material
const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const material = await ColouraMaterial.findOneAndUpdate(
            {
                _id: id,
                company: req.user.company._id
            },
            updates,
            { new: true, runValidators: true }
        );

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        res.json(material);
    } catch (error) {
        console.error('Update Material Error:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del materiale', error: error.message });
    }
};

// Delete material
const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;

        const material = await ColouraMaterial.findOneAndUpdate(
            {
                _id: id,
                company: req.user.company._id
            },
            { attivo: false },
            { new: true }
        );

        if (!material) {
            return res.status(404).json({ message: 'Materiale non trovato' });
        }

        res.json({ message: 'Materiale disattivato con successo', material });
    } catch (error) {
        console.error('Delete Material Error:', error);
        res.status(500).json({ message: 'Errore nella disattivazione del materiale', error: error.message });
    }
};

// Delete ALL materials
const deleteAllMaterials = async (req, res) => {
    try {
        const result = await ColouraMaterial.deleteMany({
            company: req.user.company._id
        });

        res.json({
            success: true,
            message: `Eliminati ${result.deletedCount} materiali con successo`,
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Delete All Materials Error:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione dei materiali', error: error.message });
    }
};

// Import from Excel
const importFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        const { parseExcelFile, mapRowToMaterial, validateMaterial } = require('../utils/excelParser');

        // Parse Excel file
        const rows = parseExcelFile(req.file.buffer);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ message: 'File vuoto o formato non valido' });
        }

        // Map and validate materials
        const materials = [];
        const errors = [];
        const duplicates = [];
        const seenCodes = new Set();

        for (let i = 0; i < rows.length; i++) {
            const materialData = mapRowToMaterial(rows[i]);

            // Validate
            const validationErrors = validateMaterial(materialData, i);
            if (validationErrors.length > 0) {
                errors.push(...validationErrors);
                continue;
            }

            // Check for duplicates
            if (materialData.codice_prodotto && materialData.codice_prodotto !== '') {
                // Check internal duplicates
                if (seenCodes.has(materialData.codice_prodotto)) {
                    duplicates.push({
                        row: i + 2,
                        codice: materialData.codice_prodotto,
                        nome: materialData.nome_prodotto + " [DUPLICATO NEL FILE]"
                    });
                    continue;
                }

                // Check DB duplicates
                const existing = await ColouraMaterial.findOne({
                    company: req.user.company._id,
                    codice_prodotto: materialData.codice_prodotto
                });

                if (existing) {
                    duplicates.push({
                        row: i + 2,
                        codice: materialData.codice_prodotto,
                        nome: materialData.nome_prodotto + (existing.attivo ? "" : " [ELIMINATO]")
                    });
                    continue;
                }

                seenCodes.add(materialData.codice_prodotto);
            }

            materials.push({
                ...materialData,
                company: req.user.company._id,
                createdBy: req.user._id
            });
        }

        // Return preview if requested
        if (req.query.preview === 'true') {
            return res.json({
                success: true,
                preview: true,
                materials,
                errors,
                duplicates,
                stats: {
                    totalRows: rows.length,
                    validMaterials: materials.length,
                    errorRows: errors.length,
                    duplicateRows: duplicates.length
                },
                debugInfo: {
                    headers: rows.length > 0 ? Object.keys(rows[0]) : [],
                    firstRow: rows.length > 0 ? rows[0] : null
                }
            });
        }

        // Insert materials
        if (materials.length === 0) {
            return res.status(400).json({
                message: 'Nessun materiale valido da importare',
                errors,
                duplicates
            });
        }

        const created = await ColouraMaterial.insertMany(materials);

        res.json({
            success: true,
            message: `${created.length} materiali importati con successo`,
            importedCount: created.length,
            errors,
            duplicates,
            stats: {
                totalRows: rows.length,
                imported: created.length,
                errorRows: errors.length,
                duplicateRows: duplicates.length
            }
        });

    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({
            message: 'Errore nell\'importazione dei materiali: ' + error.message,
            error: error.message
        });
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
