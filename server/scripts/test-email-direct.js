// Test email configuration
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('🧪 Testing email configuration...\n');

    // Test credentials (replace with actual)
    const EMAIL_USER = 'colorasnc@gmail.com';
    const APP_PASSWORD = 'fdhbrnubxaqfzzlh'; // Replace this!

    console.log('Email:', EMAIL_USER);
    console.log('Service: Gmail\n');

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: APP_PASSWORD
            }
        });

        console.log('📧 Sending test email...');

        const info = await transporter.sendMail({
            from: `WORK360 Test <${EMAIL_USER}>`,
            to: EMAIL_USER,
            subject: 'Test Email WORK360',
            html: '<h2>✅ Email Configurata Correttamente!</h2><p>Il tuo sistema email funziona!</p>'
        });

        console.log('✅ SUCCESS! Email sent:', info.messageId);
        console.log('Check your inbox at:', EMAIL_USER);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('\nDetails:', error);

        if (error.message.includes('Invalid login')) {
            console.error('\n⚠️  App Password non valida o servizio Gmail non abilitato');
            console.error('Verifica che:');
            console.error('1. Hai abilitato 2FA su Gmail');
            console.error('2. Hai creato una App Password corretta');
            console.error('3. Stai usando la App Password (16 char) e non la password normale');
        }
    }
};

testEmail();
