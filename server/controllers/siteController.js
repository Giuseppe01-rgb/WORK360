const { Op } = require('sequelize');
const { ConstructionSite, User, Attendance, WorkActivity, MaterialUsage, Note, Economia, ReportedMaterial } = require('../models');

// Create construction site
const createSite = async (req, res) => {
    try {
        // Validate assignedWorkers belong to user's company
        if (req.body.assignedWorkers && req.body.assignedWorkers.length > 0) {
            const workers = await User.findAll({
                where: {
                    id: { [Op.in]: req.body.assignedWorkers },
                    companyId: req.user.company._id
                }
            });

            if (workers.length !== req.body.assignedWorkers.length) {
                return res.status(403).json({ message: 'Alcuni lavoratori non appartengono alla tua azienda' });
            }
        }

        const site = await ConstructionSite.create({
            ...req.body,
            companyId: req.user.company._id
        });

        // Add assigned workers to many-to-many
        if (req.body.assignedWorkers && req.body.assignedWorkers.length > 0) {
            await site.setAssignedWorkers(req.body.assignedWorkers);
        }

        res.status(201).json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del cantiere', error: error.message });
    }
};

// Get all sites for company
const getSites = async (req, res) => {
    try {
        console.log('GetSites User:', req.user._id, 'Company:', req.user.company?._id);

        const sites = await ConstructionSite.findAll({
            where: { companyId: req.user.company._id },
            include: [{
                model: User,
                as: 'assignedWorkers',
                attributes: ['id', 'firstName', 'lastName', 'username'],
                through: { attributes: [] } // Don't include join table
            }],
            order: [['startDate', 'DESC']]
        });

        console.log('Sites found:', sites.length);
        res.json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei cantieri', error: error.message });
    }
};

// Get single site
const getSite = async (req, res) => {
    try {
        const site = await ConstructionSite.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.company._id
            },
            include: [{
                model: User,
                as: 'assignedWorkers',
                attributes: ['id', 'firstName', 'lastName', 'username'],
                through: { attributes: [] }
            }]
        });

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        res.json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero del cantiere', error: error.message });
    }
};

// Update site
const updateSite = async (req, res) => {
    try {
        // Prevent company field from being changed
        const { company, companyId, ...updateData } = req.body;

        // Validate assignedWorkers if provided
        if (updateData.assignedWorkers && updateData.assignedWorkers.length > 0) {
            const workers = await User.findAll({
                where: {
                    id: { [Op.in]: updateData.assignedWorkers },
                    companyId: req.user.company._id
                }
            });

            if (workers.length !== updateData.assignedWorkers.length) {
                return res.status(403).json({ message: 'Alcuni lavoratori non appartengono alla tua azienda' });
            }
        }

        const site = await ConstructionSite.findOne({
            where: {
                id: req.params.id,
                companyId: req.user.company._id
            }
        });

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        // Update site fields
        await site.update(updateData);

        // Update assigned workers if provided
        if (updateData.assignedWorkers) {
            await site.setAssignedWorkers(updateData.assignedWorkers);
        }

        // Reload with associations
        await site.reload({
            include: [{
                model: User,
                as: 'assignedWorkers',
                attributes: ['id', 'firstName', 'lastName', 'username'],
                through: { attributes: [] }
            }]
        });

        res.json(site);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento del cantiere', error: error.message });
    }
};

// Delete site and related data
const deleteSite = async (req, res) => {
    try {
        const siteId = req.params.id;
        const companyId = req.user.company._id;

        // Check if site exists and belongs to company
        const site = await ConstructionSite.findOne({
            where: {
                id: siteId,
                companyId: companyId
            }
        });

        if (!site) {
            return res.status(404).json({ message: 'Cantiere non trovato' });
        }

        // Delete related data in parallel
        await Promise.all([
            Attendance.destroy({ where: { siteId } }),
            WorkActivity.destroy({ where: { siteId } }),
            MaterialUsage.destroy({ where: { siteId } }),
            Note.destroy({ where: { siteId } }),
            Economia.destroy({ where: { siteId } }),
            ReportedMaterial.destroy({ where: { siteId } })
        ]);

        // Delete the site
        await site.destroy();

        res.json({ message: 'Cantiere e dati correlati eliminati con successo' });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del cantiere', error: error.message });
    }
};

module.exports = { createSite, getSites, getSite, updateSite, deleteSite };
