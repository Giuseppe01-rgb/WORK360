
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
require('dotenv').config({ path: envPath });

const { sequelize } = require('../config/database');
const { ConstructionSite, MaterialUsage, Economia, WorkActivity, Note, Attendance } = require('../models');
const { Op } = require('sequelize');

async function findSiteWithData() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB');

        // 1. Find ANY attendance to see which site it belongs to
        const distinctSitesWithAttendance = await Attendance.findAll({
            attributes: ['siteId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['siteId'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 5
        });

        console.log('🏗️ Top 5 Sites with Attendance:', distinctSitesWithAttendance.map(d => ({ siteId: d.siteId, count: d.getDataValue('count') })));

        if (distinctSitesWithAttendance.length === 0) {
            console.log('❌ NO ATTENDANCE DATA FOUND IN ENTIRE DB.');
        } else {
            const bestSiteId = distinctSitesWithAttendance[0].siteId;
            console.log(`\n👉 Drilling down into Site ID: ${bestSiteId}`);

            // Get Site Details
            const site = await ConstructionSite.findByPk(bestSiteId);
            console.log(`   Name: ${site ? site.name : 'Unknown'}`);

            // Check Attendance Cost Calculation
            const attendances = await Attendance.findAll({ where: { siteId: bestSiteId } });
            console.log(`   Attendances: ${attendances.length}`);
            const sampleAtt = attendances[0];
            if (sampleAtt) {
                console.log(`   Sample Attendance: ID=${sampleAtt.id}, TotalHours=${sampleAtt.totalHours}, HourlyCost=${sampleAtt.hourlyCost}, UserId=${sampleAtt.userId}`);
            }

            // Check Materials
            const materials = await MaterialUsage.findAll({ where: { siteId: bestSiteId } });
            console.log(`   Materials: ${materials.length}`);

            // Check Economie
            const economie = await Economia.findAll({ where: { siteId: bestSiteId } });
            console.log(`   Economie: ${economie.length}`);

            // Check WorkActivities
            const activities = await WorkActivity.findAll({ where: { siteId: bestSiteId } });
            console.log(`   WorkActivities: ${activities.length}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

findSiteWithData();
