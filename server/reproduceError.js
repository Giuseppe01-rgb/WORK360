// Script to reproduce 500 error
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Company = require('./models/Company');
const ColouraMaterial = require('./models/ColouraMaterial');
const MaterialUsage = require('./models/MaterialUsage');
const ConstructionSite = require('./models/ConstructionSite');
const ReportedMaterial = require('./models/ReportedMaterial'); // Ensure model is registered

// Mock response object
const res = {
    status: function (code) {
        console.log(`Response Status: ${code}`);
        return this;
    },
    json: function (data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return this;
    }
};

async function reproduce() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Get User and Company
        const user = await User.findOne({ firstName: 'Luca', lastName: 'Colora' }).populate('company');
        if (!user) throw new Error('User not found');
        console.log('👤 User:', user._id);
        console.log('🏢 Company:', user.company?._id);

        // 2. Get a Site
        const site = await ConstructionSite.findOne({ company: user.company._id });
        if (!site) {
            console.log('⚠️ No site found, creating dummy site...');
            // create dummy site if needed, or just fail
        } else {
            console.log('🏗️ Site:', site._id);
        }

        // 3. Get a Material
        const material = await ColouraMaterial.findOne({ company: user.company._id });
        if (!material) throw new Error('Material not found');
        console.log('📦 Material:', material._id);

        // 4. Simulate recordUsage
        console.log('\n--- Simulating recordUsage ---');
        const reqRecord = {
            user: user,
            body: {
                siteId: site ? site._id.toString() : 'invalid',
                materialId: material._id.toString(),
                numeroConfezioni: 2,
                note: 'Test note'
            }
        };

        // Copy-paste logic from controller (simplified)
        try {
            const { siteId, materialId, numeroConfezioni, note } = reqRecord.body;

            // Safe company ID access
            const companyId = reqRecord.user.company?._id || reqRecord.user.company;
            if (!companyId) throw new Error('No company ID');

            const materialCheck = await ColouraMaterial.findOne({
                _id: materialId,
                company: companyId,
                attivo: true
            });

            if (!materialCheck) console.log('Material check failed');
            else console.log('Material check passed');

            const usage = await MaterialUsage.create({
                company: companyId,
                site: siteId,
                material: materialId,
                user: reqRecord.user._id,
                numeroConfezioni,
                stato: 'catalogato',
                note: note || ''
            });
            console.log('✅ Usage created:', usage._id);

        } catch (error) {
            console.error('❌ recordUsage Error:', error);
        }

        // 5. Simulate getTodayUsage
        console.log('\n--- Simulating getTodayUsage ---');
        const reqGet = {
            user: user,
            query: {
                siteId: site ? site._id.toString() : undefined
            }
        };

        try {
            const { siteId } = reqGet.query;
            const companyId = reqGet.user.company?._id || reqGet.user.company;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const query = {
                company: companyId,
                user: reqGet.user._id,
                dataOra: {
                    $gte: today,
                    $lt: tomorrow
                }
            };

            if (siteId) {
                query.site = siteId;
            }

            const usages = await MaterialUsage.find(query)
                .populate('material')
                .populate('site', 'name')
                .populate('materialeReportId')
                .sort({ dataOra: -1 });

            console.log(`✅ Found ${usages.length} usages`);

        } catch (error) {
            console.error('❌ getTodayUsage Error:', error);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Setup Error:', error);
        process.exit(1);
    }
}

reproduce();
