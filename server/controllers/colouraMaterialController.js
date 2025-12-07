const { ColouraMaterial } = require('../models');

// Placeholder - return empty arrays for now
const getAllMaterials = async (req, res) => {
    res.json([]);
};

const searchMaterials = async (req, res) => {
    res.json([]);
};

const getMaterialByCode = async (req, res) => {
    res.status(404).json({ message: 'Materiale non trovato', found: false });
};

const createMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const updateMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const deleteMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const deleteAllMaterials = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const importFromExcel = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
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
