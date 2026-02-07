#!/usr/bin/env node
/**
 * WORK360 Full Backup Script
 * Level 4 Security - Export all companies data for backup
 * 
 * Usage: npm run backup:all
 * Requires: BACKUP_DIR environment variable
 * 
 * For Railway Scheduled Job:
 * - Command: npm run backup:all
 * - Schedule: 0 3 * * * (daily at 03:00)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

// Import all models
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

/**
 * Export all data for a single company
 */
async function exportCompanyData(companyId) {
    const company = await Company.findByPk(companyId, {
        attributes: { exclude: ['logo'] } // Exclude large blobs
    });

    if (!company) {
        return null;
    }

    // Fetch all related data
    const [
        users,
        constructionSites,
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
            attributes: { exclude: ['password'] }
        }),
        ConstructionSite.findAll({
            where: { companyId }
        }),
        Material.findAll({ where: { companyId } }),
        MaterialMaster.findAll({ where: { companyId } }),
        Note.findAll({ where: { companyId } }),
        Photo.findAll({
            include: [{
                model: ConstructionSite,
                as: 'site',
                where: { companyId },
                attributes: ['id', 'name'],
                required: false
            }]
        }).catch(() => []), // Handle if join fails
        Equipment.findAll({
            include: [{
                model: ConstructionSite,
                as: 'site',
                where: { companyId },
                attributes: ['id', 'name'],
                required: false
            }]
        }).catch(() => []),
        Economia.findAll({
            include: [{
                model: ConstructionSite,
                as: 'site',
                where: { companyId },
                attributes: ['id', 'name'],
                required: false
            }]
        }),
        ReportedMaterial.findAll({ where: { companyId } }),
        MaterialUsage.findAll({ where: { companyId } }),
        Quote.findAll({ where: { companyId } }),
        SAL.findAll({
            include: [{
                model: ConstructionSite,
                as: 'site',
                where: { companyId },
                attributes: ['id', 'name'],
                required: false
            }]
        }).catch(() => []),
        Supplier.findAll({ where: { companyId } }),
        WorkActivity.findAll({ where: { companyId } }),
        Document.findAll({ where: { companyId } })
    ]);

    // Get attendance separately with proper company scope
    const attendance = await Attendance.findAll({
        include: [{
            model: User,
            as: 'user',
            where: { companyId },
            attributes: ['id', 'firstName', 'lastName']
        }]
    }).catch(() => []);

    return {
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
}

/**
 * Main backup function
 */
async function main() {
    console.log('🔄 Starting WORK360 full backup...');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);

    // BACKUP_DIR - default to ./backups if not set
    const backupDir = process.env.BACKUP_DIR || './backups';
    console.log(`📁 Backup directory: ${backupDir}`);

    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Ensure backup directory exists
        const absoluteBackupDir = path.isAbsolute(backupDir)
            ? backupDir
            : path.join(process.cwd(), backupDir);

        if (!fs.existsSync(absoluteBackupDir)) {
            fs.mkdirSync(absoluteBackupDir, { recursive: true });
            console.log(`📁 Created backup directory: ${absoluteBackupDir}`);
        }

        // Fetch all companies
        const companies = await Company.findAll({
            attributes: ['id', 'name']
        });

        console.log(`📊 Found ${companies.length} companies to backup`);

        // Export each company
        const companiesData = [];
        for (const company of companies) {
            console.log(`   Exporting: ${company.name} (${company.id})`);
            const data = await exportCompanyData(company.id);
            if (data) {
                companiesData.push(data);
            }
        }

        // Build full backup object
        const backupData = {
            generatedAt: new Date().toISOString(),
            backupVersion: '1.0',
            totalCompanies: companiesData.length,
            companies: companiesData
        };

        // Generate filename
        const now = new Date();
        const dateStr = now.toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
        const filename = `work360-backup-${dateStr}.json`;
        const filepath = path.join(absoluteBackupDir, filename);

        // Write backup file
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');

        console.log('');
        console.log('✅ Backup completed successfully!');
        console.log(`📄 File: ${filepath}`);
        console.log(`📦 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
        console.log(`🏢 Companies: ${companiesData.length}`);

        process.exit(0);
    } catch (error) {
        console.error('');
        console.error('❌ Backup failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the backup
main();
