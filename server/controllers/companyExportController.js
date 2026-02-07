/**
 * Company Export Controller
 * Level 4 Security - Data Export for single company (owner only)
 */

const {
    Company,
    User,
    ConstructionSite,
    Attendance,
    Material,
    MaterialMaster,
    Note,
    Photo,
    Equipment,
    Economia,
    ReportedMaterial,
    MaterialUsage,
    Quote,
    SAL,
    Supplier,
    WorkActivity,
    Document
} = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { logAction, AUDIT_ACTIONS } = require('../utils/auditLogger');

/**
 * Export all company data as downloadable JSON
 * @route GET /api/company/export
 * @access Private (Owner only)
 */
const exportCompanyData = async (req, res) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({ message: 'Company ID non trovato' });
        }

        // Fetch company
        const company = await Company.findByPk(companyId, {
            attributes: { exclude: ['logo'] } // Exclude large logo blob from export
        });

        if (!company) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }

        // Fetch all related data in parallel
        const [
            users,
            constructionSites,
            attendance,
            materials,
            materialMasters,
            notes,
            photos,
            equipment,
            economias,
            reportedMaterials,
            materialUsages,
            quotes,
            sals,
            suppliers,
            workActivities,
            documents
        ] = await Promise.all([
            User.findAll({
                where: { companyId },
                attributes: { exclude: ['password'] } // Exclude passwords
            }),
            ConstructionSite.findAll({
                where: { companyId },
                paranoid: false // Include soft-deleted records
            }),
            Attendance.findAll({
                include: [{
                    model: ConstructionSite,
                    as: 'site',
                    where: { companyId },
                    attributes: ['id', 'name']
                }]
            }),
            Material.findAll({ where: { companyId } }),
            MaterialMaster.findAll({ where: { companyId } }),
            Note.findAll({ where: { companyId } }),
            Photo.findAll({
                include: [{
                    model: ConstructionSite,
                    as: 'site',
                    where: { companyId },
                    attributes: ['id', 'name']
                }]
            }),
            Equipment.findAll({
                include: [{
                    model: ConstructionSite,
                    as: 'site',
                    where: { companyId },
                    attributes: ['id', 'name']
                }]
            }),
            Economia.findAll({
                include: [{
                    model: ConstructionSite,
                    as: 'site',
                    where: { companyId },
                    attributes: ['id', 'name']
                }],
                paranoid: false // Include soft-deleted records
            }),
            ReportedMaterial.findAll({ where: { companyId } }),
            MaterialUsage.findAll({ where: { companyId } }),
            Quote.findAll({ where: { companyId } }),
            SAL.findAll({
                include: [{
                    model: ConstructionSite,
                    as: 'site',
                    where: { companyId },
                    attributes: ['id', 'name']
                }]
            }),
            Supplier.findAll({ where: { companyId } }),
            WorkActivity.findAll({ where: { companyId } }),
            Document.findAll({ where: { companyId } })
        ]);

        // Build export object
        const exportData = {
            exportedAt: new Date().toISOString(),
            company: company.toJSON(),
            users: users.map(u => u.toJSON()),
            constructionSites: constructionSites.map(s => s.toJSON()),
            attendance: attendance.map(a => a.toJSON()),
            materials: materials.map(m => m.toJSON()),
            materialMasters: materialMasters.map(m => m.toJSON()),
            notes: notes.map(n => n.toJSON()),
            photos: photos.map(p => p.toJSON()),
            equipment: equipment.map(e => e.toJSON()),
            economias: economias.map(e => e.toJSON()),
            reportedMaterials: reportedMaterials.map(r => r.toJSON()),
            materialUsages: materialUsages.map(m => m.toJSON()),
            quotes: quotes.map(q => q.toJSON()),
            sals: sals.map(s => s.toJSON()),
            suppliers: suppliers.map(s => s.toJSON()),
            workActivities: workActivities.map(w => w.toJSON()),
            documents: documents.map(d => d.toJSON())
        };

        // Generate filename with date
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replaceAll(/-/g, '');
        const filename = `work360-company-export-${companyId}-${dateStr}.json`;

        // Set headers for download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId,
            action: AUDIT_ACTIONS.COMPANY_DATA_EXPORTED,
            targetType: 'company',
            targetId: companyId,
            ipAddress: req.ip,
            meta: { filename, companyName: company.name }
        });

        res.json(exportData);
    } catch (error) {
        console.error('Export company data error:', error);
        res.status(500).json({
            message: 'Errore nell\'esportazione dei dati aziendali',
            error: error.message
        });
    }
};

module.exports = {
    exportCompanyData
};
