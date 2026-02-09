#!/usr/bin/env node
/**
 * WORK360 Full Backup Script
 * Level 4 Security - Export all companies data for backup
 * 
 * Usage: npm run backup:all
 * Requires: 
 *   - BACKUP_DIR environment variable (optional, defaults to ./backups)
 *   - BACKUP_RECIPIENT_EMAIL - email address to receive backups
 *   - EMAIL_USER, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT - SMTP config
 * 
 * For Railway Scheduled Job:
 * - Command: npm run backup:all
 * - Schedule: 0 3 * * * (daily at 03:00)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
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
 * Send backup via email
 */
async function sendBackupEmail(filepath, filename, stats) {
    const recipientEmail = process.env.BACKUP_RECIPIENT_EMAIL;

    if (!recipientEmail) {
        console.log('⚠️  BACKUP_RECIPIENT_EMAIL not set, skipping email...');
        return false;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log('⚠️  Email credentials not configured (EMAIL_USER/EMAIL_PASSWORD), skipping email...');
        return false;
    }

    console.log(`📧 Sending backup to: ${recipientEmail}`);

    try {
        const emailPort = parseInt(process.env.EMAIL_PORT) || 465;
        const isSecure = emailPort === 465;

        console.log(`📧 SMTP Config: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}:${emailPort} (secure: ${isSecure})`);

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: emailPort,
            secure: isSecure, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            // Increased timeouts for Railway environment
            connectionTimeout: 30000, // 30 seconds
            greetingTimeout: 30000,
            socketTimeout: 60000
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        const now = new Date();
        const dateFormatted = now.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0;">🔒 WORK360 Backup</h1>
                </div>
                <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; color: #333;">
                        Il backup giornaliero di WORK360 è stato completato con successo.
                    </p>
                    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h3 style="margin-top: 0; color: #1e293b;">📊 Statistiche Backup</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #64748b;">Data:</td><td style="padding: 8px 0; font-weight: bold;">${dateFormatted}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Aziende:</td><td style="padding: 8px 0; font-weight: bold;">${stats.totalCompanies}</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Dimensione file:</td><td style="padding: 8px 0; font-weight: bold;">${fileSize} KB</td></tr>
                            <tr><td style="padding: 8px 0; color: #64748b;">Nome file:</td><td style="padding: 8px 0; font-weight: bold;">${filename}</td></tr>
                        </table>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        ⚠️ Conserva questo file in un luogo sicuro (Google Drive, Dropbox, etc.)
                    </p>
                </div>
                <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
                    © ${now.getFullYear()} WORK360 - Backup automatico
                </p>
            </div>
        `;

        const mailOptions = {
            from: `WORK360 Backup <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `🔒 WORK360 Backup - ${dateFormatted}`,
            html,
            attachments: [
                {
                    filename,
                    path: filepath,
                    contentType: 'application/json'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully! MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        return false;
    }
}

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
        console.log('✅ Backup file created successfully!');
        console.log(`📄 File: ${filepath}`);
        console.log(`📦 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
        console.log(`🏢 Companies: ${companiesData.length}`);

        // Send backup via email
        console.log('');
        const emailSent = await sendBackupEmail(filepath, filename, { totalCompanies: companiesData.length });

        if (emailSent) {
            console.log('✅ Backup completed and sent via email!');
        } else {
            console.log('⚠️  Backup completed but email not sent (check configuration)');
        }

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
