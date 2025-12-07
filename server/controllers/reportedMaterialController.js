const { ReportedMaterial } = require('../models');

// Placeholder - return empty array for now
const getReportedMaterials = async (req, res) => {
    res.json([]);
};

const reportNewMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const approveMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const rejectMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

module.exports = {
    getReportedMaterials,
    reportNewMaterial,
    approveMaterial,
    rejectMaterial
};
