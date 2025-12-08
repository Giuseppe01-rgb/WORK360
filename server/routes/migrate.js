/**
 * Migration API Route
 * Temporary endpoint to run MongoDB to PostgreSQL migration
 */

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { sequelize } = require('../config/database');

// MongoDB connection
const MONGO_URI = 'mongodb+srv://admin:admin123@cluster0.fwejqek.mongodb.net/?appName=Cluster0';

// Helper function to generate UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// @route   GET /api/migrate/run
// @desc    Run MongoDB to PostgreSQL migration
// @access  Public (temporary - remove after migration)
router.get('/run', async (req, res) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('🚀 Starting MongoDB to PostgreSQL Migration...');

        // Connect to MongoDB
        log('📦 Connecting to MongoDB Atlas...');
        const mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();

        // Try different database names
        let mongoDb = mongoClient.db('work360');
        let collections = await mongoDb.listCollections().toArray();

        if (collections.length === 0) {
            mongoDb = mongoClient.db('test');
            collections = await mongoDb.listCollections().toArray();
        }

        log('✅ Connected to MongoDB');
        log('📋 Collections found: ' + collections.map(c => c.name).join(', '));

        // ID mapping
        const idMaps = {
            users: {},
            companies: {},
            sites: {}
        };

        const stats = {};

        // 1. Migrate Companies
        log('🏢 Migrating companies...');
        try {
            const companies = await mongoDb.collection('companies').find({}).toArray();
            stats.companies = { found: companies.length, migrated: 0, errors: 0 };

            for (const company of companies) {
                try {
                    const newId = generateUUID();
                    idMaps.companies[company._id.toString()] = newId;

                    await sequelize.query(`
                        INSERT INTO companies (id, name, vat_number, address, phone, email, logo, created_at, updated_at)
                        VALUES (:id, :name, :vatNumber, :address, :phone, :email, :logo, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            name: company.name || 'Azienda Migrata',
                            vatNumber: company.vatNumber || company.piva || null,
                            address: company.address || null,
                            phone: company.phone || null,
                            email: company.email || null,
                            logo: company.logo || null,
                            createdAt: company.createdAt || new Date(),
                            updatedAt: company.updatedAt || new Date()
                        }
                    });
                    stats.companies.migrated++;
                } catch (err) {
                    log(`  Error: ${err.message}`);
                    stats.companies.errors++;
                }
            }
            log(`  ✅ Companies: ${stats.companies.migrated}/${stats.companies.found}`);
        } catch (err) {
            log('  ⚠️ No companies collection: ' + err.message);
        }

        // 2. Migrate Users
        log('👥 Migrating users...');
        try {
            const users = await mongoDb.collection('users').find({}).toArray();
            stats.users = { found: users.length, migrated: 0, errors: 0 };

            for (const user of users) {
                try {
                    const newId = generateUUID();
                    idMaps.users[user._id.toString()] = newId;

                    // Get or create company
                    let companyId = null;
                    if (user.company) {
                        const companyIdStr = user.company._id?.toString() || user.company.toString();
                        companyId = idMaps.companies[companyIdStr];
                        if (!companyId) {
                            companyId = generateUUID();
                            idMaps.companies[companyIdStr] = companyId;
                            await sequelize.query(`
                                INSERT INTO companies (id, name, created_at, updated_at)
                                VALUES (:id, :name, NOW(), NOW())
                                ON CONFLICT (id) DO NOTHING
                            `, { replacements: { id: companyId, name: 'Azienda ' + (user.firstName || 'Migrata') } });
                        }
                    }

                    await sequelize.query(`
                        INSERT INTO users (id, username, email, password, first_name, last_name, role, company_id, hourly_cost, active, created_at, updated_at)
                        VALUES (:id, :username, :email, :password, :firstName, :lastName, :role, :companyId, :hourlyCost, :active, :createdAt, :updatedAt)
                        ON CONFLICT (username) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            username: user.username || user.email?.split('@')[0] || 'user_' + Date.now(),
                            email: user.email || null,
                            password: user.password || '$2b$10$default',
                            firstName: user.firstName || 'Nome',
                            lastName: user.lastName || 'Cognome',
                            role: user.role || 'worker',
                            companyId: companyId,
                            hourlyCost: user.hourlyCost || 25,
                            active: user.active !== false,
                            createdAt: user.createdAt || new Date(),
                            updatedAt: user.updatedAt || new Date()
                        }
                    });
                    stats.users.migrated++;
                } catch (err) {
                    log(`  User error: ${err.message}`);
                    stats.users.errors++;
                }
            }
            log(`  ✅ Users: ${stats.users.migrated}/${stats.users.found}`);
        } catch (err) {
            log('  ⚠️ No users collection: ' + err.message);
        }

        // 3. Migrate Sites
        log('🏗️ Migrating construction sites...');
        try {
            const sites = await mongoDb.collection('constructionsites').find({}).toArray();
            stats.sites = { found: sites.length, migrated: 0, errors: 0 };

            for (const site of sites) {
                try {
                    const newId = generateUUID();
                    idMaps.sites[site._id.toString()] = newId;

                    let companyId = null;
                    if (site.company) {
                        const companyIdStr = site.company._id?.toString() || site.company.toString();
                        companyId = idMaps.companies[companyIdStr];
                    }

                    await sequelize.query(`
                        INSERT INTO construction_sites (id, name, address, status, start_date, end_date, description, company_id, contract_value, created_at, updated_at)
                        VALUES (:id, :name, :address, :status, :startDate, :endDate, :description, :companyId, :contractValue, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            name: site.name || 'Cantiere Migrato',
                            address: site.address || site.location || null,
                            status: site.status || 'active',
                            startDate: site.startDate || null,
                            endDate: site.endDate || null,
                            description: site.description || null,
                            companyId: companyId,
                            contractValue: site.contractValue || null,
                            createdAt: site.createdAt || new Date(),
                            updatedAt: site.updatedAt || new Date()
                        }
                    });
                    stats.sites.migrated++;
                } catch (err) {
                    log(`  Site error: ${err.message}`);
                    stats.sites.errors++;
                }
            }
            log(`  ✅ Sites: ${stats.sites.migrated}/${stats.sites.found}`);
        } catch (err) {
            log('  ⚠️ No sites collection: ' + err.message);
        }

        // 4. Migrate Attendances
        log('⏰ Migrating attendances...');
        try {
            const attendances = await mongoDb.collection('attendances').find({}).toArray();
            stats.attendances = { found: attendances.length, migrated: 0, errors: 0 };

            for (const att of attendances) {
                try {
                    const newId = generateUUID();
                    const userIdStr = att.user?._id?.toString() || att.user?.toString() || att.userId?.toString();
                    const siteIdStr = att.site?._id?.toString() || att.site?.toString() || att.siteId?.toString();

                    const userId = idMaps.users[userIdStr];
                    const siteId = idMaps.sites[siteIdStr];

                    if (!userId || !siteId) {
                        stats.attendances.errors++;
                        continue;
                    }

                    await sequelize.query(`
                        INSERT INTO attendances (id, user_id, site_id, clock_in, clock_out, total_hours, notes, created_at, updated_at)
                        VALUES (:id, :userId, :siteId, :clockIn, :clockOut, :totalHours, :notes, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            userId: userId,
                            siteId: siteId,
                            clockIn: att.clockIn?.time || att.clockIn || null,
                            clockOut: att.clockOut?.time || att.clockOut || null,
                            totalHours: att.totalHours || 0,
                            notes: att.notes || null,
                            createdAt: att.createdAt || new Date(),
                            updatedAt: att.updatedAt || new Date()
                        }
                    });
                    stats.attendances.migrated++;
                } catch (err) {
                    stats.attendances.errors++;
                }
            }
            log(`  ✅ Attendances: ${stats.attendances.migrated}/${stats.attendances.found}`);
        } catch (err) {
            log('  ⚠️ No attendances: ' + err.message);
        }

        // Close MongoDB
        await mongoClient.close();

        log('');
        log('═══════════════════════════════════════════');
        log('📊 MIGRATION COMPLETE');
        log('═══════════════════════════════════════════');

        res.json({
            success: true,
            stats,
            logs
        });

    } catch (error) {
        log('❌ Migration failed: ' + error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            logs
        });
    }
});

// @route   GET /api/migrate/check
// @desc    Check MongoDB collections without migrating
// @access  Public
router.get('/check', async (req, res) => {
    try {
        const mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();

        // Try different database names
        const dbNames = ['work360', 'test', 'WORK360'];
        const results = {};

        for (const dbName of dbNames) {
            const db = mongoClient.db(dbName);
            const collections = await db.listCollections().toArray();

            if (collections.length > 0) {
                results[dbName] = {};
                for (const col of collections) {
                    const count = await db.collection(col.name).countDocuments();
                    results[dbName][col.name] = count;
                }
            }
        }

        await mongoClient.close();

        res.json({
            success: true,
            databases: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
