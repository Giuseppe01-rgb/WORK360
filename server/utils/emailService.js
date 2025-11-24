const nodemailer = require('nodemailer');
const { decrypt } = require('./encryption');

/**
 * Create email transporter with company-specific credentials
 * @param {Object} emailConfig - Company email configuration
 * @returns {Object} Nodemailer transporter
 */
const createTransporter = (emailConfig) => {
    if (!emailConfig || !emailConfig.user || !emailConfig.password) {
        throw new Error('Configurazione email mancante. Vai in Impostazioni Azienda per configurare l\'email.');
    }

    // Decrypt password before use
    const decryptedPassword = decrypt(emailConfig.password);

    const transporterConfig = {
        auth: {
            user: emailConfig.user,
            pass: decryptedPassword
        }
    };

    // Use service shorthand (gmail, outlook) or custom SMTP
    if (emailConfig.service && emailConfig.service !== 'custom') {
        transporterConfig.service = emailConfig.service;
    } else {
        transporterConfig.host = emailConfig.host;
        transporterConfig.port = emailConfig.port || 587;
        transporterConfig.secure = emailConfig.port === 465; // true for 465, false for other ports
    }

    return nodemailer.createTransporter(transporterConfig);
};

/**
 * Send email with PDF attachment using company-specific credentials
 * @param {Object} emailConfig - Company email configuration
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {string} filename - PDF filename
 */
exports.sendEmailWithCompanyConfig = async (emailConfig, to, subject, html, pdfBuffer, filename) => {
    const transporter = createTransporter(emailConfig);

    const fromName = emailConfig.fromName || 'WORK360';
    const mailOptions = {
        from: `${fromName} <${emailConfig.user}>`,
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
 * Legacy: Send email with PDF attachment using global .env credentials
 * This is kept for backward compatibility when company email not configured
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {string} filename - PDF filename
 */
exports.sendEmailWithPDF = async (to, subject, html, pdfBuffer, filename) => {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
    }

    const transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

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
        console.log('✉️  Email sent (legacy):', info.messageId);
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
