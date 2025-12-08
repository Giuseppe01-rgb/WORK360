/**
 * MongoDB to PostgreSQL Migration Script
 * Migrates data from MongoDB Atlas to PostgreSQL on Railway
 */

const { MongoClient } = require('mongodb');
const { Sequelize, DataTypes } = require('sequelize');

// MongoDB connection
const MONGO_URI = 'mongodb+srv://admin:admin123@cluster0.fwejqek.mongodb.net/?appName=Cluster0';

// PostgreSQL connection (Railway)
const POSTGRES_URI = process.env.DATABASE_URL || 'postgresql://postgres:NYTDndcXjrMBnOAOCvYqTnCTFgGjHuqL@junction.proxy.rlwy.net:41125/railway';

async function migrate() {
    console.log('🚀 Starting MongoDB to PostgreSQL Migration...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB Atlas...');
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db('test'); // Default database name, might need adjustment
    console.log('✅ Connected to MongoDB\n');

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

    // List all collections in MongoDB
    console.log('📋 Listing MongoDB collections...');
    const collections = await mongoDb.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name).join(', '));
    console.log('');

    // Migration stats
    const stats = {};

    // Helper function to generate UUID from MongoDB ObjectId
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // ID mapping (MongoDB ObjectId -> PostgreSQL UUID)
    const idMaps = {
        users: {},
        companies: {},
        sites: {},
        attendances: {},
        materials: {},
        quotes: {}
    };

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
            } catch (err) {
                console.error(`  Error migrating company ${company._id}:`, err.message);
                stats.companies.errors++;
            }
        }
        console.log(`  ✅ Companies: ${stats.companies.migrated}/${stats.companies.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No companies collection or error:', err.message, '\n');
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

                // Get or create company mapping
                let companyId = null;
                if (user.company) {
                    const companyIdStr = user.company._id?.toString() || user.company.toString();
                    companyId = idMaps.companies[companyIdStr];
                    if (!companyId) {
                        // Create company if not exists
                        companyId = generateUUID();
                        idMaps.companies[companyIdStr] = companyId;
                        await sequelize.query(`
                            INSERT INTO companies (id, name, created_at, updated_at)
                            VALUES (:id, :name, NOW(), NOW())
                            ON CONFLICT (id) DO NOTHING
                        `, {
                            replacements: {
                                id: companyId,
                                name: 'Azienda ' + (user.firstName || 'Migrata')
                            }
                        });
                    }
                }

                await sequelize.query(`
                    INSERT INTO users (id, username, email, password, first_name, last_name, role, company_id, hourly_cost, active, created_at, updated_at)
                    VALUES (:id, :username, :email, :password, :firstName, :lastName, :role, :companyId, :hourlyCost, :active, :createdAt, :updatedAt)
                    ON CONFLICT (id) DO NOTHING
                `, {
                    replacements: {
                        id: newId,
                        username: user.username || user.email?.split('@')[0] || 'user_' + Date.now(),
                        email: user.email || null,
                        password: user.password || '$2b$10$defaulthashedpassword',
                        firstName: user.firstName || user.name?.split(' ')[0] || 'Nome',
                        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || 'Cognome',
                        role: user.role || 'worker',
                        companyId: companyId,
                        hourlyCost: user.hourlyCost || user.hourlyRate || 25,
                        active: user.active !== false,
                        createdAt: user.createdAt || new Date(),
                        updatedAt: user.updatedAt || new Date()
                    }
                });
                stats.users.migrated++;
            } catch (err) {
                console.error(`  Error migrating user ${user._id}:`, err.message);
                stats.users.errors++;
            }
        }
        console.log(`  ✅ Users: ${stats.users.migrated}/${stats.users.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No users collection or error:', err.message, '\n');
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

                // Get company mapping
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
                        description: site.description || site.notes || null,
                        companyId: companyId,
                        contractValue: site.contractValue || site.budget || null,
                        createdAt: site.createdAt || new Date(),
                        updatedAt: site.updatedAt || new Date()
                    }
                });
                stats.sites.migrated++;
            } catch (err) {
                console.error(`  Error migrating site ${site._id}:`, err.message);
                stats.sites.errors++;
            }
        }
        console.log(`  ✅ Sites: ${stats.sites.migrated}/${stats.sites.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No constructionsites collection or error:', err.message, '\n');
    }

    // 4. Migrate Attendances
    console.log('⏰ Migrating attendances...');
    try {
        const attendances = await mongoDb.collection('attendances').find({}).toArray();
        stats.attendances = { found: attendances.length, migrated: 0, errors: 0 };

        for (const att of attendances) {
            try {
                const newId = generateUUID();

                // Get user and site mappings
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
                        clockIn: att.clockIn?.time || att.clockIn || att.checkIn || null,
                        clockOut: att.clockOut?.time || att.clockOut || att.checkOut || null,
                        totalHours: att.totalHours || att.hours || 0,
                        notes: att.notes || null,
                        createdAt: att.createdAt || new Date(),
                        updatedAt: att.updatedAt || new Date()
                    }
                });
                stats.attendances.migrated++;
            } catch (err) {
                console.error(`  Error migrating attendance ${att._id}:`, err.message);
                stats.attendances.errors++;
            }
        }
        console.log(`  ✅ Attendances: ${stats.attendances.migrated}/${stats.attendances.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No attendances collection or error:', err.message, '\n');
    }

    // 5. Migrate Materials
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
                        notes: mat.notes || mat.description || null,
                        createdAt: mat.createdAt || new Date(),
                        updatedAt: mat.updatedAt || new Date()
                    }
                });
                stats.materials.migrated++;
            } catch (err) {
                console.error(`  Error migrating material ${mat._id}:`, err.message);
                stats.materials.errors++;
            }
        }
        console.log(`  ✅ Materials: ${stats.materials.migrated}/${stats.materials.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No materials collection or error:', err.message, '\n');
    }

    // 6. Migrate Quotes
    console.log('📋 Migrating quotes...');
    try {
        const quotes = await mongoDb.collection('quotes').find({}).toArray();
        stats.quotes = { found: quotes.length, migrated: 0, errors: 0 };

        for (const quote of quotes) {
            try {
                const newId = generateUUID();

                const companyIdStr = quote.company?._id?.toString() || quote.company?.toString();
                const companyId = idMaps.companies[companyIdStr];

                await sequelize.query(`
                    INSERT INTO quotes (id, quote_number, type, client_name, client_address, client_email, client_phone, items, subtotal, vat_rate, vat_amount, total, notes, status, company_id, created_at, updated_at)
                    VALUES (:id, :quoteNumber, :type, :clientName, :clientAddress, :clientEmail, :clientPhone, :items, :subtotal, :vatRate, :vatAmount, :total, :notes, :status, :companyId, :createdAt, :updatedAt)
                    ON CONFLICT (id) DO NOTHING
                `, {
                    replacements: {
                        id: newId,
                        quoteNumber: quote.quoteNumber || quote.number || 'Q-' + Date.now(),
                        type: quote.type || 'preventivo',
                        clientName: quote.clientName || quote.client?.name || 'Cliente',
                        clientAddress: quote.clientAddress || quote.client?.address || null,
                        clientEmail: quote.clientEmail || quote.client?.email || null,
                        clientPhone: quote.clientPhone || quote.client?.phone || null,
                        items: JSON.stringify(quote.items || []),
                        subtotal: quote.subtotal || 0,
                        vatRate: quote.vatRate || 22,
                        vatAmount: quote.vatAmount || 0,
                        total: quote.total || 0,
                        notes: quote.notes || null,
                        status: quote.status || 'draft',
                        companyId: companyId,
                        createdAt: quote.createdAt || new Date(),
                        updatedAt: quote.updatedAt || new Date()
                    }
                });
                stats.quotes.migrated++;
            } catch (err) {
                console.error(`  Error migrating quote ${quote._id}:`, err.message);
                stats.quotes.errors++;
            }
        }
        console.log(`  ✅ Quotes: ${stats.quotes.migrated}/${stats.quotes.found} migrated\n`);
    } catch (err) {
        console.log('  ⚠️ No quotes collection or error:', err.message, '\n');
    }

    // Print summary
    console.log('═══════════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════');
    for (const [collection, data] of Object.entries(stats)) {
        console.log(`${collection}: ${data.migrated}/${data.found} migrated (${data.errors} errors)`);
    }
    console.log('═══════════════════════════════════════════');

    // Close connections
    await mongoClient.close();
    await sequelize.close();

    console.log('\n✅ Migration completed!');
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
