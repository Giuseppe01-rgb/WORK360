/**
 * MongoDB LOCAL to PostgreSQL Migration Script
 * Migrates data from local MongoDB to PostgreSQL on Railway
 */

const { MongoClient } = require('mongodb');
const { Sequelize } = require('sequelize');

// MongoDB LOCAL connection
const MONGO_URI = 'mongodb://localhost:27017/work360';

// PostgreSQL connection (Railway) - get from environment or use public URL
const POSTGRES_URI = process.env.DATABASE_URL || 'postgresql://postgres:NYTDndcXjrMBnOAOCvYqTnCTFgGjHuqL@junction.proxy.rlwy.net:41125/railway';

// Helper function to generate UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

async function migrate() {
    console.log('🚀 Starting MongoDB LOCAL to PostgreSQL Migration...\n');

    // Connect to MongoDB LOCAL
    console.log('📦 Connecting to MongoDB LOCAL...');
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db('work360');
    console.log('✅ Connected to MongoDB LOCAL\n');

    // Connect to PostgreSQL
    console.log('🐘 Connecting to PostgreSQL...');
    const sequelize = new Sequelize(POSTGRES_URI, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    // ID mapping (MongoDB ObjectId -> PostgreSQL UUID)
    const idMaps = {
        users: {},
        companies: {},
        sites: {}
    };

    const stats = {};

    // 1. Migrate Companies
    console.log('🏢 Migrating companies...');
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
                console.log(`  ✓ Company: ${company.name}`);
            } catch (err) {
                console.error(`  ✗ Error: ${err.message}`);
                stats.companies.errors++;
            }
        }
        console.log(`  ✅ Companies: ${stats.companies.migrated}/${stats.companies.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No companies: ' + err.message + '\n');
    }

    // 2. Migrate Users
    console.log('👥 Migrating users...');
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

                // Check if username exists
                const [existing] = await sequelize.query(
                    `SELECT id FROM users WHERE username = :username`,
                    { replacements: { username: user.username || 'user_migrated' } }
                );

                if (existing.length > 0) {
                    console.log(`  ⚠️ Username exists: ${user.username}, updating ID map`);
                    idMaps.users[user._id.toString()] = existing[0].id;
                    stats.users.migrated++;
                    continue;
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
                console.log(`  ✓ User: ${user.username} (${user.role})`);
            } catch (err) {
                console.error(`  ✗ User error: ${err.message}`);
                stats.users.errors++;
            }
        }
        console.log(`  ✅ Users: ${stats.users.migrated}/${stats.users.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No users: ' + err.message + '\n');
    }

    // 3. Migrate Construction Sites
    console.log('🏗️ Migrating construction sites...');
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
                        contractValue: site.contractValue || site.budget || null,
                        createdAt: site.createdAt || new Date(),
                        updatedAt: site.updatedAt || new Date()
                    }
                });
                stats.sites.migrated++;
                console.log(`  ✓ Site: ${site.name}`);
            } catch (err) {
                console.error(`  ✗ Site error: ${err.message}`);
                stats.sites.errors++;
            }
        }
        console.log(`  ✅ Sites: ${stats.sites.migrated}/${stats.sites.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No sites: ' + err.message + '\n');
    }

    // 4. Migrate Attendances
    console.log('⏰ Migrating attendances...');
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
                    console.log(`  ⚠️ Skipping attendance - missing user/site mapping`);
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
                console.log(`  ✓ Attendance migrated`);
            } catch (err) {
                console.error(`  ✗ Attendance error: ${err.message}`);
                stats.attendances.errors++;
            }
        }
        console.log(`  ✅ Attendances: ${stats.attendances.migrated}/${stats.attendances.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No attendances: ' + err.message + '\n');
    }

    // 5. Migrate Notes
    console.log('📝 Migrating notes...');
    try {
        const notes = await mongoDb.collection('notes').find({}).toArray();
        stats.notes = { found: notes.length, migrated: 0, errors: 0 };

        for (const note of notes) {
            try {
                const newId = generateUUID();
                const userIdStr = note.user?._id?.toString() || note.user?.toString() || note.userId?.toString();
                const siteIdStr = note.site?._id?.toString() || note.site?.toString() || note.siteId?.toString();

                const userId = idMaps.users[userIdStr];
                const siteId = idMaps.sites[siteIdStr];

                await sequelize.query(`
                    INSERT INTO notes (id, content, user_id, site_id, created_at, updated_at)
                    VALUES (:id, :content, :userId, :siteId, :createdAt, :updatedAt)
                    ON CONFLICT (id) DO NOTHING
                `, {
                    replacements: {
                        id: newId,
                        content: note.content || note.text || '',
                        userId: userId,
                        siteId: siteId,
                        createdAt: note.createdAt || new Date(),
                        updatedAt: note.updatedAt || new Date()
                    }
                });
                stats.notes.migrated++;
                console.log(`  ✓ Note migrated`);
            } catch (err) {
                console.error(`  ✗ Note error: ${err.message}`);
                stats.notes.errors++;
            }
        }
        console.log(`  ✅ Notes: ${stats.notes.migrated}/${stats.notes.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No notes: ' + err.message + '\n');
    }

    // 6. Migrate Materials
    console.log('📦 Migrating materials...');
    try {
        const materials = await mongoDb.collection('materials').find({}).toArray();
        stats.materials = { found: materials.length, migrated: 0, errors: 0 };

        for (const mat of materials) {
            try {
                const newId = generateUUID();
                const siteIdStr = mat.site?._id?.toString() || mat.site?.toString() || mat.siteId?.toString();
                const siteId = idMaps.sites[siteIdStr];

                await sequelize.query(`
                    INSERT INTO materials (id, name, quantity, unit, site_id, unit_price, notes, created_at, updated_at)
                    VALUES (:id, :name, :quantity, :unit, :siteId, :unitPrice, :notes, :createdAt, :updatedAt)
                    ON CONFLICT (id) DO NOTHING
                `, {
                    replacements: {
                        id: newId,
                        name: mat.name || 'Materiale',
                        quantity: mat.quantity || 1,
                        unit: mat.unit || 'pz',
                        siteId: siteId,
                        unitPrice: mat.unitPrice || mat.price || null,
                        notes: mat.notes || null,
                        createdAt: mat.createdAt || new Date(),
                        updatedAt: mat.updatedAt || new Date()
                    }
                });
                stats.materials.migrated++;
                console.log(`  ✓ Material: ${mat.name}`);
            } catch (err) {
                console.error(`  ✗ Material error: ${err.message}`);
                stats.materials.errors++;
            }
        }
        console.log(`  ✅ Materials: ${stats.materials.migrated}/${stats.materials.found}\n`);
    } catch (err) {
        console.log('  ⚠️ No materials: ' + err.message + '\n');
    }

    // Print summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════');
    let totalMigrated = 0;
    let totalFound = 0;
    for (const [collection, data] of Object.entries(stats)) {
        console.log(`${collection}: ${data.migrated}/${data.found} migrated (${data.errors} errors)`);
        totalMigrated += data.migrated;
        totalFound += data.found;
    }
    console.log('═══════════════════════════════════════════');
    console.log(`TOTAL: ${totalMigrated}/${totalFound} documents migrated`);
    console.log('═══════════════════════════════════════════');

    // Close connections
    await mongoClient.close();
    await sequelize.close();

    console.log('\n✅ Migration completed successfully!');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
