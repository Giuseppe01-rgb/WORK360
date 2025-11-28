// Script to check user and company
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Company = require('./models/Company');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find user "Luca Colora"
        const user = await User.findOne({ firstName: 'Luca', lastName: 'Colora' }).populate('company');

        if (!user) {
            console.log('❌ User "Luca Colora" not found');
        } else {
            console.log('👤 User found:', {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                role: user.role,
                company: user.company ? {
                    id: user.company._id,
                    name: user.company.nome
                } : 'NULL (No company assigned!)'
            });
        }

        // List all companies
        const companies = await Company.find();
        console.log(`\n🏢 Total Companies: ${companies.length}`);
        companies.forEach(c => console.log(` - ${c.nome} (${c._id})`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUser();
