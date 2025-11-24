require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('Testing email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not Set');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not Set');
    console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail (default)');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('❌ Missing credentials in .env');
        return;
    }

    const transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    try {
        console.log('Attempting to verify connection...');
        await transporter.verify();
        console.log('✅ Connection successful!');

        console.log('Attempting to send test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'WORK360 Test Email',
            text: 'If you receive this, email sending is working correctly!'
        });
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Details:', error.response);
        }
    }
};

testEmail();
