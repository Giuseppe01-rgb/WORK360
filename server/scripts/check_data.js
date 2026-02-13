const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Independent of CWD
const { sequelize } = require('../config/database');
const { ConstructionSite, User, Attendance } = require('../models');

async function checkData() {
    try {
        console.log('--- DATA INTEGRITY CHECK ---');

        // 1. List ALL sites to debug DB content
        console.log('--- LISTING ALL SITES ---');
        const sites = await ConstructionSite.findAll({
            limit: 50,
            order: [['createdAt', 'DESC']]
        });

        if (sites.length === 0) {
            console.log('❌ NO SITES FOUND in DB.');
            return;
        }

        console.log(`✅ FOUND ${sites.length} SITES.`);
        sites.forEach(s => {
            console.log(`   - [${s.id}] ${s.name}`);
            console.log(`     Contract: ${s.contractValue}, CompanyID: ${s.companyId}`);
        });

        // Try to find Rooswood manually from list or pick first one
        const site = sites.find(s => s.name.toLowerCase().includes('rooswood')) || sites[0];
        console.log(`✅ FOUND SITE: [${site.id}] ${site.name}`);
        console.log(`   Contract Value: ${site.contractValue}`);
        console.log(`   Company ID: ${site.companyId}`);

        // 2. Check Users and their Costs
        console.log('\n--- USERS CHECK ---');
        const users = await User.findAll({
            where: { companyId: site.companyId },
            attributes: ['id', 'firstName', 'lastName', 'hourlyCost']
        });
        console.log(`Found ${users.length} users.`);
        users.forEach(u => {
            console.log(`   - ${u.firstName} ${u.lastName}: ${u.hourlyCost}€/h (ID: ${u.id})`);
        });

        // 3. Check Attendances for this Site
        console.log(`\n--- ATTENDANCES CHECK (Site: ${site.name}) ---`);
        const attendances = await Attendance.findAll({
            where: { siteId: site.id },
            include: [{ model: User, as: 'user', attributes: ['lastName', 'hourlyCost'] }],
            limit: 10,
            order: [['createdAt', 'DESC']]
        });

        console.log(`Found ${attendances.length} recent attendances (showing max 10).`);

        if (attendances.length === 0) {
            console.log('❌ NO ATTENDANCES found for this specific site ID.');
            console.log('   Checking if attendances exist for ANY site...');
            const anyAtt = await Attendance.findOne();
            if (anyAtt) {
                console.log(`   ! Attendances exist in DB (e.g. SiteID: ${anyAtt.siteId}). Possible ID mismatch?`);
            } else {
                console.log('   ! Table "attendances" seems empty.');
            }
        } else {
            attendances.forEach(a => {
                console.log(`   - [${a.date || a.createdAt}] User: ${a.user?.lastName}`);
                console.log(`     TotalHours: ${a.totalHours}`);
                console.log(`     Attendance HourlyCost (snapshot): ${a.hourlyCost}`);
                console.log(`     User HourlyCost (current): ${a.user?.hourlyCost}`);
                console.log(`     ClockOut: ${a.clockOut ? 'YES' : 'NO'}`);

                // Simulate controller logic
                const snapshotCost = Number(a.hourlyCost);
                const userCost = Number(a.user?.hourlyCost);
                const effectiveCost = snapshotCost > 0 ? snapshotCost : (userCost > 0 ? userCost : 0);
                console.log(`     => EFFECTIVE COST CALCULATED: ${effectiveCost}€/h`);
                console.log('     ------------------------------');
            });
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

checkData();
