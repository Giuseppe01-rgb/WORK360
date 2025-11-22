const nodemailer = require('nodemailer');

// Create email transporter
// Use Gmail or other email service
const createTransporter = () => {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️  Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
        return null;
    }

    return nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

/**
 * Send email with PDF attachment
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {string} filename - PDF filename
 */
exports.sendEmailWithPDF = async (to, subject, html, pdfBuffer, filename) => {
    const transporter = createTransporter();

    if (!transporter) {
        throw new Error('Email service not configured');
    }

    const mailOptions = {
        from: `WORK360 <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: [
            {
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✉️  Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email send error:', error);
        throw error;
    }
};

/**
 * Send simple email without attachment
 */
exports.sendEmail = async (to, subject, html) => {
    const transporter = createTransporter();

    if (!transporter) {
        throw new Error('Email service not configured');
    }

    const mailOptions = {
        from: `WORK360 <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✉️  Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email send error:', error);
        throw error;
    }
};
