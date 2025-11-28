const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

async function seedUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/work360');
        console.log('✅ Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ username: 'admin.luca.colorasrl' });
        if (existingUser) {
            console.log('⚠️  User already exists!');
            mongoose.connection.close();
            process.exit(0);
        }

        // Create or find company
        let company = await Company.findOne({ name: /colorasrl/i });
        if (!company) {
            company = await Company.create({
                name: 'colorasrl',
                ownerName: 'luca'
            });
            console.log('✅ Created company: colorasrl');
        } else {
            console.log('ℹ️  Company already exists: colorasrl');
        }

        // Create user
        const user = await User.create({
            username: 'admin.luca.colorasrl',
            password: 'Luca1234',
            role: 'owner',
            company: company._id,
            firstName: 'Luca',
            lastName: 'Colora'
        });

        console.log('✅ Created user: admin.luca.colorasrl');
        console.log('   Password: Luca1234');
        console.log('   Role: owner');

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedUser();
