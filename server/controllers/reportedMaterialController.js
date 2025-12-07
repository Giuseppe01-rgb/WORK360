const { ReportedMaterial } = require('../models');

const getReportedMaterials = async (req, res) => {
    res.json([]);
};

const reportNewMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const approveAndCreateNew = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const approveAndAssociate = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

const rejectMaterial = async (req, res) => {
    res.status(501).json({ message: 'Funzione non ancora disponibile in PostgreSQL' });
};

module.exports = {
    getReportedMaterials,
    reportNewMaterial,
    approveAndCreateNew,
    approveAndAssociate,
    rejectMaterial
};
