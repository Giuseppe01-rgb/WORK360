const { User, Company } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { sanitizeAllDates } = require('../utils/dateValidator');
const { upload } = require('./photoController');
const { logAction, AUDIT_ACTIONS } = require('../utils/auditLogger');

// Generate random password
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Get all users in company
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { companyId: getCompanyId(req) },
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new user
const createUser = async (req, res) => {
    try {
        const { role, firstName, lastName, email, phone, birthDate } = req.body;

        // Get company
        const company = await Company.findByPk(getCompanyId(req));
        if (!company) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }

        // Generate username
        // Format for owner: admin.firstname.companyname
        // Format for worker: firstname.companyname
        const companySlug = company.name.toLowerCase().replace(/\s+/g, '');
        const firstNameSlug = firstName.toLowerCase().replace(/\s+/g, '');

        let username;
        if (role === 'owner') {
            username = `admin.${firstNameSlug}.${companySlug}`;
        } else {
            username = `${firstNameSlug}.${companySlug}`;
        }

        // Check if username exists, add number if needed
        let finalUsername = username;
        let counter = 1;
        while (await User.findOne({ where: { username: finalUsername } })) {
            finalUsername = `${username}${counter}`;
            counter++;
        }

        // Generate password
        const generatedPassword = generatePassword();

        // Sanitize dates
        const userData = sanitizeAllDates({
            username: finalUsername,
            password: generatedPassword,
            role,
            companyId: getCompanyId(req),
            firstName,
            lastName,
            email,
            phone,
            birthDate,
            hourlyCost: req.body.hourlyCost || 0
        });

        // Create user
        const user = await User.create(userData);

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.USER_CREATED,
            targetType: 'user',
            targetId: user.id,
            ipAddress: req.ip,
            meta: { firstName, lastName, role, username: finalUsername }
        });

        // Return user without password but include generated password for one-time display
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            ...userResponse,
            username: finalUsername,
            generatedPassword // Only returned once
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, firstName, lastName, email, phone, birthDate } = req.body;

        const user = await User.findOne({
            where: {
                id,
                companyId: getCompanyId(req)
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Build update data
        const updateData = {};
        if (role) updateData.role = role;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (birthDate !== undefined) updateData.birthDate = birthDate;
        if (req.body.hourlyCost !== undefined) updateData.hourlyCost = req.body.hourlyCost;

        // Sanitize dates
        const sanitizedUpdate = sanitizeAllDates(updateData);

        await user.update(sanitizedUpdate);

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.USER_UPDATED,
            targetType: 'user',
            targetId: user.id,
            ipAddress: req.ip,
            meta: { firstName: user.firstName, lastName: user.lastName, updatedFields: Object.keys(updateData) }
        });

        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === getUserId(req)) {
            return res.status(400).json({ message: 'Non puoi eliminare il tuo account' });
        }

        const user = await User.findOne({
            where: {
                id,
                companyId: getCompanyId(req)
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Store info for audit log
        const userInfo = { firstName: user.firstName, lastName: user.lastName };

        await user.destroy();

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: AUDIT_ACTIONS.USER_DELETED,
            targetType: 'user',
            targetId: id,
            ipAddress: req.ip,
            meta: userInfo
        });

        res.json({ message: 'Utente eliminato con successo' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const uploadSignature = async (req, res) => {
    try {
        console.log('=== SIGNATURE UPLOAD REQUEST ===');
        console.log('User ID:', getUserId(req));
        console.log('Has signature in body:', !!req.body.signature);
        console.log('Signature length:', req.body.signature?.length);

        // Check if signature is provided as base64 (from canvas)
        if (req.body.signature) {
            console.log('Attempting to save signature for user:', getUserId(req));
            const user = await User.findByPk(getUserId(req));

            if (!user) {
                console.error('User not found:', getUserId(req));
                return res.status(404).json({ message: 'Utente non trovato' });
            }

            user.signature = req.body.signature; // Store base64 directly
            await user.save();
            console.log('Signature saved successfully for user:', user.id);

            return res.json({ message: 'Firma salvata con successo', signature: user.signature });
        }

        // Fallback: file upload
        if (!req.file) {
            return res.status(400).json({ message: 'Nessuna firma fornita' });
        }

        const user = await User.findByPk(getUserId(req));
        user.signature = req.file.path;
        await user.save();

        res.json({ message: 'Firma caricata con successo', signature: user.signature });
    } catch (error) {
        console.error('Signature save error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: error.message });
    }
};

// Update company email configuration
const updateEmailConfig = async (req, res) => {
    try {
        const { service, host, port, user, password, fromName } = req.body;

        if (!user || !password) {
            return res.status(400).json({ message: 'Email e password sono obbligatori' });
        }

        // Encrypt password before saving
        const { encrypt } = require('../utils/encryption');
        const encryptedPassword = encrypt(password);

        const company = await Company.findByPk(getCompanyId(req));
        if (!company) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }

        company.emailConfig = {
            service: service || 'gmail',
            host,
            port: port || 587,
            user,
            password: encryptedPassword,
            fromName: fromName || company.name,
            configured: true
        };

        await company.save();

        res.json({
            success: true,
            message: 'Configurazione email salvata con successo',
            emailConfig: {
                service: company.emailConfig.service,
                host: company.emailConfig.host,
                port: company.emailConfig.port,
                user: company.emailConfig.user,
                fromName: company.emailConfig.fromName,
                configured: company.emailConfig.configured
            }
        });
    } catch (error) {
        console.error('Error updating email config:', error);
        res.status(500).json({ message: 'Errore nel salvataggio della configurazione email', error: error.message });
    }
};

// Test email configuration
const testEmailConfig = async (req, res) => {
    try {
        const company = await Company.findByPk(getCompanyId(req));
        if (!company || !company.emailConfig || !company.emailConfig.configured) {
            return res.status(400).json({
                error: 'Email non configurata',
                message: 'Configura prima le credenziali email'
            });
        }

        const { sendEmailWithCompanyConfig } = require('../utils/emailService');

        // Send test email
        await sendEmailWithCompanyConfig(
            company.emailConfig,
            company.emailConfig.user, // Send to self
            'Test Email WORK360',
            `<h2>✅ Email Configurata Correttamente!</h2>
             <p>La tua configurazione email per <strong>${company.name}</strong> funziona perfettamente.</p>
             <p>Ora puoi inviare preventivi ai tuoi clienti via email.</p>
             <br>
             <p><em>WORK360 - Gestione Cantieri</em></p>`,
            null,
            null
        );

        res.json({
            success: true,
            message: `Email di test inviata a ${company.emailConfig.user}. Controlla la tua casella!`
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            error: 'Errore invio email di test',
            message: error.message,
            details: 'Verifica che le credenziali siano corrette. Se usi Gmail, assicurati di aver creato una App Password.'
        });
    }
};

// @desc    Change user password
// @route   POST /api/users/change-password
// @access  Private (Any authenticated user)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'La nuova password deve essere lunga almeno 6 caratteri' });
        }

        // Get user with password field
        const user = await User.findByPk(getUserId(req));
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password attuale non corretta' });
        }

        // Update password (will be auto-hashed by pre-save hook)
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password aggiornata con successo' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Errore durante l\'aggiornamento della password', error: error.message });
    }
};

// @desc    Reset user password (Owner only - for employees)
// @route   POST /api/users/:id/reset-password
// @access  Private (Owner)
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify user belongs to owner's company
        const user = await User.findOne({
            where: {
                id,
                companyId: getCompanyId(req)
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato nella tua azienda' });
        }

        // Prevent resetting own password (use change password instead)
        if (id === getUserId(req)) {
            return res.status(400).json({ message: 'Usa la funzione Cambia Password per il tuo account' });
        }

        // Generate new password
        const newPassword = generatePassword();

        // Update password (will be auto-hashed by pre-save hook)
        user.password = newPassword;
        await user.save();

        // Return username and new password
        res.json({
            message: 'Password resettata con successo',
            username: user.username,
            password: newPassword, // Only returned this one time
            firstName: user.firstName,
            lastName: user.lastName
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Errore durante il reset della password', error: error.message });
    }
};

// @desc    Send welcome email to user with credentials
// @route   POST /api/users/:id/send-welcome
// @access  Private (Owner)
const sendWelcomeEmailToUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user
        const user = await User.findOne({
            where: {
                id,
                companyId: getCompanyId(req)
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato nella tua azienda' });
        }

        // Check if user has email
        if (!user.email) {
            return res.status(400).json({
                message: 'L\'utente non ha un indirizzo email configurato. Aggiungi prima l\'email nelle informazioni utente.'
            });
        }

        // Get company with email config
        const company = await Company.findByPk(getCompanyId(req));
        if (!company) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }

        // Check if company email is configured
        if (!company.emailConfig || !company.emailConfig.configured) {
            return res.status(400).json({
                message: 'Configurazione email aziendale mancante. Vai in Impostazioni Azienda per configurare l\'email SMTP.'
            });
        }

        // Generate new password for the user
        const newPassword = generatePassword();

        // Update user password
        user.password = newPassword;
        await user.save();

        // Send welcome email
        const { sendWelcomeEmail } = require('../utils/emailService');

        await sendWelcomeEmail(
            company.emailConfig,
            user.email,
            user.firstName,
            user.username,
            newPassword,
            company.name
        );

        // Audit log
        await logAction({
            userId: getUserId(req),
            companyId: getCompanyId(req),
            action: 'WELCOME_EMAIL_SENT',
            targetType: 'user',
            targetId: user.id,
            ipAddress: req.ip,
            meta: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

        res.json({
            success: true,
            message: `Email di benvenuto inviata a ${user.email}`,
            username: user.username,
            password: newPassword // Return for display in modal
        });
    } catch (error) {
        console.error('Send welcome email error:', error);
        res.status(500).json({
            message: 'Errore nell\'invio dell\'email di benvenuto',
            error: error.message
        });
    }
};

module.exports = {
    uploadSignature,
    upload,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateEmailConfig,
    testEmailConfig,
    changePassword,
    resetUserPassword,
    sendWelcomeEmailToUser
};
