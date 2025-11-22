const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const ConstructionSite = require('./models/ConstructionSite');
require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const attendances = await Attendance.find().populate('user').populate('site');
        console.log(`Found ${attendances.length} attendance records`);

        attendances.forEach(a => {
            console.log('---');
            console.log(`User: ${a.user?.username} (${a.user?._id})`);
            console.log(`Site: ${a.site?.name} (${a.site?._id})`);
            console.log(`ClockIn: ${a.clockIn?.time}`);
            console.log(`ClockOut: ${a.clockOut?.time}`);
            console.log(`TotalHours: ${a.totalHours}`);
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
