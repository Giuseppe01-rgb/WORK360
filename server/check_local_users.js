const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/work360')
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}).select('username role');

        console.log('\n📋 Users in database:');
        if (users.length === 0) {
            console.log('❌ No users found in the database!');
        } else {
            users.forEach(user => {
                console.log(`- ${user.username} (${user.role})`);
            });
        }

        mongoose.connection.close();
        process.exit(0);
    }).catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
