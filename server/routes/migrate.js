/**
 * Migration API Route - FIXED
 * Endpoint to import MongoDB data to PostgreSQL
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

// Helper function to generate UUID
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.trunc(Math.random() * 16);
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// @route   POST /api/migrate/import
// @desc    Import MongoDB data from JSON
// @access  Public (temporary - remove after migration)
router.post('/import', express.json({ limit: '50mb' }), async (req, res) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        const data = req.body;
        log('🚀 Starting data import...');

        // ID mapping (MongoDB _id -> PostgreSQL UUID)
        const idMaps = {
            users: {},
            companies: {},
            sites: {}
        };
        const stats = {};

        // 1. Import Companies
        log('🏢 Importing companies...');
        if (data.companies && data.companies.length > 0) {
            stats.companies = { found: data.companies.length, migrated: 0, errors: 0 };

            for (const company of data.companies) {
                try {
                    const newId = generateUUID();
                    idMaps.companies[company._id] = newId;

                    // Use correct column names from Company model
                    await sequelize.query(`
                        INSERT INTO companies (id, name, owner_name, address, phone, email, piva, logo, active, created_at, updated_at)
                        VALUES (:id, :name, :ownerName, :address, :phone, :email, :piva, :logo, :active, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            name: company.name || 'Azienda',
                            ownerName: company.ownerName || 'Proprietario',
                            address: JSON.stringify(company.address || {}),
                            phone: company.phone || null,
                            email: company.email || null,
                            piva: company.piva || company.vatNumber || null,
                            logo: company.logo || null,
                            active: company.active !== false,
                            createdAt: company.createdAt || new Date(),
                            updatedAt: company.updatedAt || new Date()
                        }
                    });
                    stats.companies.migrated++;
                    log(`  ✓ Company: ${company.name}`);
                } catch (err) {
                    log(`  ✗ Error: ${err.message}`);
                    stats.companies.errors++;
                }
            }
        }

        // 2. Import Users
        log('👥 Importing users...');
        if (data.users && data.users.length > 0) {
            stats.users = { found: data.users.length, migrated: 0, errors: 0 };

            for (const user of data.users) {
                try {
                    const newId = generateUUID();
                    idMaps.users[user._id] = newId;

                    const companyId = idMaps.companies[user.company] || null;

                    // Check if username exists
                    const [existing] = await sequelize.query(
                        `SELECT id FROM users WHERE username = :username`,
                        { replacements: { username: user.username || 'user_migrated' } }
                    );

                    if (existing.length > 0) {
                        log(`  ⚠️ Username exists: ${user.username}`);
                        idMaps.users[user._id] = existing[0].id;
                        stats.users.migrated++;
                        continue;
                    }

                    await sequelize.query(`
                        INSERT INTO users (id, username, email, password, first_name, last_name, role, company_id, hourly_cost, active, created_at, updated_at)
                        VALUES (:id, :username, :email, :password, :firstName, :lastName, :role, :companyId, :hourlyCost, :active, :createdAt, :updatedAt)
                    `, {
                        replacements: {
                            id: newId,
                            username: user.username || 'user_' + Date.now(),
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
                    log(`  ✓ User: ${user.username} (${user.role})`);
                } catch (err) {
                    log(`  ✗ User error: ${err.message}`);
                    stats.users.errors++;
                }
            }
        }

        // 3. Import Sites
        log('🏗️ Importing construction sites...');
        if (data.constructionsites && data.constructionsites.length > 0) {
            stats.sites = { found: data.constructionsites.length, migrated: 0, errors: 0 };

            for (const site of data.constructionsites) {
                try {
                    const newId = generateUUID();
                    idMaps.sites[site._id] = newId;

                    const companyId = idMaps.companies[site.company] || null;

                    await sequelize.query(`
                        INSERT INTO construction_sites (id, name, address, status, start_date, end_date, description, company_id, contract_value, created_at, updated_at)
                        VALUES (:id, :name, :address, :status, :startDate, :endDate, :description, :companyId, :contractValue, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            name: site.name || 'Cantiere',
                            address: site.address || null,
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
                    log(`  ✓ Site: ${site.name}`);
                } catch (err) {
                    log(`  ✗ Site error: ${err.message}`);
                    stats.sites.errors++;
                }
            }
        }

        // 4. Import Attendances
        log('⏰ Importing attendances...');
        if (data.attendances && data.attendances.length > 0) {
            stats.attendances = { found: data.attendances.length, migrated: 0, errors: 0 };

            for (const att of data.attendances) {
                try {
                    const newId = generateUUID();
                    const userId = idMaps.users[att.user] || idMaps.users[att.userId];
                    const siteId = idMaps.sites[att.site] || idMaps.sites[att.siteId];

                    if (!userId || !siteId) {
                        log(`  ⚠️ Skipping attendance - missing user/site`);
                        stats.attendances.errors++;
                        continue;
                    }

                    // Handle clockIn structure - convert to JSONB format expected by PostgreSQL
                    let clockIn = null;
                    if (att.clockIn) {
                        if (typeof att.clockIn === 'object') {
                            clockIn = JSON.stringify(att.clockIn);
                        } else {
                            clockIn = JSON.stringify({ time: att.clockIn, location: null });
                        }
                    }

                    let clockOut = null;
                    if (att.clockOut) {
                        if (typeof att.clockOut === 'object') {
                            clockOut = JSON.stringify(att.clockOut);
                        } else {
                            clockOut = JSON.stringify({ time: att.clockOut, location: null });
                        }
                    }

                    await sequelize.query(`
                        INSERT INTO attendances (id, user_id, site_id, clock_in, clock_out, total_hours, notes, created_at, updated_at)
                        VALUES (:id, :userId, :siteId, :clockIn::jsonb, :clockOut::jsonb, :totalHours, :notes, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            userId: userId,
                            siteId: siteId,
                            clockIn: clockIn,
                            clockOut: clockOut,
                            totalHours: att.totalHours || 0,
                            notes: att.notes || null,
                            createdAt: att.createdAt || new Date(),
                            updatedAt: att.updatedAt || new Date()
                        }
                    });
                    stats.attendances.migrated++;
                    log(`  ✓ Attendance migrated`);
                } catch (err) {
                    log(`  ✗ Attendance error: ${err.message}`);
                    stats.attendances.errors++;
                }
            }
        }

        // 5. Import Notes
        log('📝 Importing notes...');
        if (data.notes && data.notes.length > 0) {
            stats.notes = { found: data.notes.length, migrated: 0, errors: 0 };

            for (const note of data.notes) {
                try {
                    const newId = generateUUID();
                    const userId = idMaps.users[note.user] || idMaps.users[note.userId];
                    const siteId = idMaps.sites[note.site] || idMaps.sites[note.siteId];

                    // Get company ID from user or site
                    let companyId = null;
                    if (userId) {
                        const [userRow] = await sequelize.query(
                            `SELECT company_id FROM users WHERE id = :userId`,
                            { replacements: { userId } }
                        );
                        if (userRow.length > 0) {
                            companyId = userRow[0].company_id;
                        }
                    }

                    if (!companyId) {
                        log(`  ⚠️ Skipping note - no company found`);
                        stats.notes.errors++;
                        continue;
                    }

                    await sequelize.query(`
                        INSERT INTO notes (id, content, user_id, site_id, company_id, type, created_at, updated_at)
                        VALUES (:id, :content, :userId, :siteId, :companyId, :type, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            content: note.content || note.text || '',
                            userId: userId,
                            siteId: siteId,
                            companyId: companyId,
                            type: 'note',
                            createdAt: note.createdAt || new Date(),
                            updatedAt: note.updatedAt || new Date()
                        }
                    });
                    stats.notes.migrated++;
                    log(`  ✓ Note migrated`);
                } catch (err) {
                    log(`  ✗ Note error: ${err.message}`);
                    stats.notes.errors++;
                }
            }
        }

        // 6. Import Materials (with correct columns)
        log('📦 Importing materials...');
        if (data.materials && data.materials.length > 0) {
            stats.materials = { found: data.materials.length, migrated: 0, errors: 0 };

            for (const mat of data.materials) {
                try {
                    const newId = generateUUID();
                    const siteId = idMaps.sites[mat.site] || idMaps.sites[mat.siteId];
                    const userId = idMaps.users[mat.user] || idMaps.users[mat.userId];

                    // Get company ID from user
                    let companyId = null;
                    if (userId) {
                        const [userRow] = await sequelize.query(
                            `SELECT company_id FROM users WHERE id = :userId`,
                            { replacements: { userId } }
                        );
                        if (userRow.length > 0) {
                            companyId = userRow[0].company_id;
                        }
                    }

                    if (!userId || !siteId || !companyId) {
                        log(`  ⚠️ Skipping material - missing user/site/company`);
                        stats.materials.errors++;
                        continue;
                    }

                    await sequelize.query(`
                        INSERT INTO materials (id, name, quantity, unit, site_id, user_id, company_id, notes, created_at, updated_at)
                        VALUES (:id, :name, :quantity, :unit, :siteId, :userId, :companyId, :notes, :createdAt, :updatedAt)
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            name: mat.name || 'Materiale',
                            quantity: mat.quantity || 1,
                            unit: mat.unit || 'pz',
                            siteId: siteId,
                            userId: userId,
                            companyId: companyId,
                            notes: mat.notes || null,
                            createdAt: mat.createdAt || new Date(),
                            updatedAt: mat.updatedAt || new Date()
                        }
                    });
                    stats.materials.migrated++;
                    log(`  ✓ Material: ${mat.name}`);
                } catch (err) {
                    log(`  ✗ Material error: ${err.message}`);
                    stats.materials.errors++;
                }
            }
        }

        log('');
        log('═══════════════════════════════════════════');
        log('📊 IMPORT COMPLETE');
        log('═══════════════════════════════════════════');

        res.json({
            success: true,
            stats,
            logs,
            idMaps
        });

    } catch (error) {
        log('❌ Import failed: ' + error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            logs
        });
    }
});

// @route   GET /api/migrate/status
// @desc    Check migration status
// @access  Public
router.get('/status', async (req, res) => {
    try {
        const [companies] = await sequelize.query('SELECT COUNT(*) as count FROM companies');
        const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
        const [sites] = await sequelize.query('SELECT COUNT(*) as count FROM construction_sites');
        const [attendances] = await sequelize.query('SELECT COUNT(*) as count FROM attendances');
        const [catalog] = await sequelize.query('SELECT COUNT(*) as count FROM material_masters');

        res.json({
            success: true,
            counts: {
                companies: Number.parseInt(companies[0].count),
                users: Number.parseInt(users[0].count),
                sites: Number.parseInt(sites[0].count),
                attendances: Number.parseInt(attendances[0].count),
                catalog: Number.parseInt(catalog[0].count)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   POST /api/migrate/catalog
// @desc    Import catalog (colouramaterials) to material_masters
// @access  Public (temporary - remove after migration)
router.post('/catalog', express.json({ limit: '50mb' }), async (req, res) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        const data = req.body;
        log('🚀 Starting catalog import...');

        const stats = { found: 0, migrated: 0, errors: 0 };

        // Get company ID from PostgreSQL (use existing company)
        const [companies] = await sequelize.query('SELECT id FROM companies LIMIT 1');
        if (companies.length === 0) {
            return res.status(400).json({ success: false, error: 'No company found in database' });
        }
        const companyId = companies[0].id;

        // Get user ID for createdById
        const [users] = await sequelize.query('SELECT id FROM users LIMIT 1');
        const userId = users.length > 0 ? users[0].id : null;

        log(`Using company: ${companyId}`);

        if (data.colouramaterials && data.colouramaterials.length > 0) {
            stats.found = data.colouramaterials.length;

            for (const mat of data.colouramaterials) {
                try {
                    const generateUUID = () => {
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                            const r = Math.trunc(Math.random() * 16);
                            const v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        });
                    };

                    const newId = generateUUID();
                    const displayName = mat.nome_prodotto || 'Materiale';
                    const normalizedKey = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 100);

                    await sequelize.query(`
                        INSERT INTO material_masters (id, company_id, family, spec, unit, display_name, normalized_key, supplier, barcode, price, created_by_id, created_at, updated_at)
                        VALUES (:id, :companyId, :family, :spec, :unit, :displayName, :normalizedKey, :supplier, :barcode, :price, :createdById, :createdAt, :updatedAt)
                        ON CONFLICT (company_id, normalized_key) DO NOTHING
                    `, {
                        replacements: {
                            id: newId,
                            companyId: companyId,
                            family: mat.categoria || 'Altro',
                            spec: mat.marca || '',
                            unit: mat.quantita || 'pz',
                            displayName: displayName,
                            normalizedKey: normalizedKey,
                            supplier: mat.fornitore || '',
                            barcode: mat.codice_prodotto || '',
                            price: mat.prezzo || null,
                            createdById: userId,
                            createdAt: mat.createdAt || new Date(),
                            updatedAt: mat.updatedAt || new Date()
                        }
                    });
                    stats.migrated++;

                    if (stats.migrated % 50 === 0) {
                        log(`  Progress: ${stats.migrated}/${stats.found}`);
                    }
                } catch (err) {
                    stats.errors++;
                    if (stats.errors < 5) {
                        log(`  ✗ Error: ${err.message}`);
                    }
                }
            }
        }

        log(`✅ Catalog import complete: ${stats.migrated}/${stats.found} (${stats.errors} errors)`);

        res.json({
            success: true,
            stats,
            logs
        });
    } catch (error) {
        log('❌ Catalog import failed: ' + error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            logs
        });
    }
});

// @route   GET /api/migrate/lunch-break
// @desc    Apply lunch break deduction to all existing attendances
// @access  Public (temporary - remove after migration complete)
router.get('/lunch-break', async (req, res) => {
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        const { calculateWorkedHours } = require('../utils/workedHoursCalculator');
        const { Op } = require('sequelize');

        log('===========================================');
        log('Migration: Apply Lunch Break Deduction');
        log('===========================================');
        log('');

        // Get all attendances with both clockIn and clockOut
        const [attendances] = await sequelize.query(`
            SELECT id, clock_in, clock_out, total_hours 
            FROM attendances 
            WHERE clock_out IS NOT NULL
        `);

        log(`Found ${attendances.length} completed attendances to process`);
        log('');

        let updated = 0;
        let unchanged = 0;
        let errors = 0;

        for (const attendance of attendances) {
            try {
                const clockIn = attendance.clock_in?.time;
                const clockOut = attendance.clock_out?.time;

                if (!clockIn || !clockOut) {
                    log(`  [SKIP] ${attendance.id}: missing timestamps`);
                    unchanged++;
                    continue;
                }

                // Calculate with new lunch break rule
                const { workedHours, presenceHours, lunchBreakApplied } = calculateWorkedHours(clockIn, clockOut);
                const oldHours = Number.parseFloat(attendance.total_hours) || 0;

                // Only update if there's a difference (more than 0.5h change = lunch break applied)
                if (Math.abs(oldHours - workedHours) > 0.4) {
                    await sequelize.query(
                        `UPDATE attendances SET total_hours = :workedHours WHERE id = :id`,
                        { replacements: { workedHours, id: attendance.id } }
                    );
                    log(`  [UPDATED] ${attendance.id}: ${oldHours}h → ${workedHours}h (presence: ${presenceHours}h, lunch: ${lunchBreakApplied ? 'YES' : 'NO'})`);
                    updated++;
                } else {
                    unchanged++;
                }
            } catch (err) {
                log(`  [ERROR] ${attendance.id}: ${err.message}`);
                errors++;
            }
        }

        log('');
        log('===========================================');
        log('Migration Complete');
        log('===========================================');
        log(`  Updated: ${updated}`);
        log(`  Unchanged: ${unchanged}`);
        log(`  Errors: ${errors}`);
        log(`  Total: ${attendances.length}`);

        res.json({
            success: true,
            results: {
                updated,
                unchanged,
                errors,
                total: attendances.length
            },
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

module.exports = router;
