const nodemailer = require('nodemailer');
const { decrypt } = require('./encryption');

/**
 * Create email transporter with company-specific credentials
 * @param {Object} emailConfig - Company email configuration
 * @returns {Object} Nodemailer transporter
 */
const createTransport = (emailConfig) => {
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
    if (emailConfig.service === 'gmail') {
        transporterConfig.host = 'smtp.gmail.com';
        transporterConfig.port = 587;
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
    } else if (emailConfig.service && emailConfig.service !== 'custom') {
        transporterConfig.service = emailConfig.service;
    } else {
        transporterConfig.host = emailConfig.host;
        transporterConfig.port = emailConfig.port || 587;
        transporterConfig.secure = emailConfig.port === 465; // true for 465, false for other ports
    }

    // Add timeouts to prevent hanging
    transporterConfig.connectionTimeout = 10000; // 10 seconds
    transporterConfig.greetingTimeout = 5000;    // 5 seconds
    transporterConfig.socketTimeout = 10000;     // 10 seconds

    return nodemailer.createTransport(transporterConfig);
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
    const transporter = createTransport(emailConfig);

    try {
        // Verify connection first
        await transporter.verify();
        console.log('✅ SMTP Connection verified');

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

    const transporter = nodemailer.createTransport({
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
    const transporter = createTransport();

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

/**
 * Send welcome email to new user with credentials
 * @param {Object} emailConfig - Company email configuration
 * @param {string} to - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} username - Generated username
 * @param {string} password - Generated password
 * @param {string} companyName - Company name
 */
exports.sendWelcomeEmail = async (emailConfig, to, firstName, username, password, companyName) => {
    const transporter = createTransport(emailConfig);

    const subject = 'Benvenuto su WORK360 👷‍♂️✨';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; }
                .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; }
                .content { padding: 40px 30px; }
                .greeting { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 20px; }
                .text { color: #475569; margin-bottom: 16px; }
                .credentials-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 30px 0; }
                .credentials-title { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
                .credential-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
                .credential-row:last-child { border-bottom: none; }
                .credential-label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
                .credential-value { font-family: 'Monaco', 'Menlo', monospace; font-size: 16px; font-weight: 700; color: #1e293b; background: #fff; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0; }
                .warning p { color: #92400e; margin: 0; font-size: 14px; }
                .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px 0; }
                .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
                .footer p { color: #94a3b8; font-size: 13px; margin: 0; }
                .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>WORK360</h1>
                    <p>${companyName}</p>
                </div>
                <div class="content">
                    <p class="greeting">Ciao ${firstName}!</p>
                    <p class="text">Benvenuto in <strong>WORK360</strong>, il nuovo strumento che useremo ogni giorno per semplificare il lavoro di tutti.</p>
                    <p class="text">WORK360 nasce con un obiettivo chiaro: rendere più facile e veloce quello che già fai, senza fronzoli e senza tecnicismi.</p>
                    <p class="text">Qui potrai segnare presenze, materiali e tutto ciò che serve al cantiere… in modo semplice, diretto e alla portata di tutti.</p>
                    
                    <div class="credentials-box">
                        <div class="credentials-title">🔐 Le tue credenziali di accesso</div>
                        <div class="credential-row">
                            <span class="credential-label">Username</span>
                            <span class="credential-value">${username}</span>
                        </div>
                        <div class="credential-row">
                            <span class="credential-label">Password</span>
                            <span class="credential-value">${password}</span>
                        </div>
                    </div>
                    
                    <div class="warning">
                        <p>⚠️ <strong>Conserva queste credenziali in un luogo sicuro!</strong> Ti serviranno per accedere all'app.</p>
                    </div>
                    
                    <p class="text">Non devi imparare nulla di complicato: l'app parla la nostra lingua, quella dei cantieri, della pratica e del "facciamo prima".</p>
                    <p class="text">E se qualcosa non ti torna, scrivici: siamo qui proprio per questo.</p>
                    
                    <div class="signature">
                        <p class="text">Grazie per far parte del progetto e per il lavoro che fai ogni giorno.</p>
                        <p class="text"><strong>Da oggi lo affrontiamo insieme</strong> — più organizzati, più veloci, e con uno strumento pensato davvero per chi lavora sul campo.</p>
                        <p class="text" style="margin-top: 20px;">A presto! 👋</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} WORK360 - Gestione intelligente dell'azienda</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await transporter.verify();
        console.log('✅ SMTP Connection verified for welcome email');

        const fromName = emailConfig.fromName || companyName || 'WORK360';
        const mailOptions = {
            from: `${fromName} <${emailConfig.user}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✉️  Welcome email sent to:', to, 'messageId:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Welcome email error:', error);
        throw error;
    }
};
