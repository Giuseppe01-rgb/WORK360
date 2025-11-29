const User = require('../models/User');
const Company = require('../models/Company');
const { upload } = require('./photoController');

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
        const users = await User.find({ company: req.user.company })
            .select('-password')
            .sort({ createdAt: -1 });
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
        const company = await Company.findById(req.user.company);
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
        while (await User.findOne({ username: finalUsername })) {
            finalUsername = `${username}${counter}`;
            counter++;
        }

        // Generate password
        const generatedPassword = generatePassword();

        // Create user
        const user = await User.create({
            username: finalUsername,
            password: generatedPassword,
            role,
            company: req.user.company,
            firstName,
            lastName,
            email,
            phone,
            birthDate,
            hourlyCost: req.body.hourlyCost || 0
        });

        // Return user without password but include generated password for one-time display
        const userResponse = user.toObject();
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

        const user = await User.findOne({ _id: id, company: req.user.company });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Update fields
        if (role) user.role = role;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (birthDate !== undefined) user.birthDate = birthDate;
        if (req.body.hourlyCost !== undefined) user.hourlyCost = req.body.hourlyCost;

        await user.save();

        const userResponse = user.toObject();
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
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'Non puoi eliminare il tuo account' });
        }

        const user = await User.findOneAndDelete({ _id: id, company: req.user.company });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        res.json({ message: 'Utente eliminato con successo' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const uploadSignature = async (req, res) => {
    try {
        console.log('=== SIGNATURE UPLOAD REQUEST ===');
        console.log('User ID:', req.user?._id);
        console.log('Has signature in body:', !!req.body.signature);
        console.log('Signature length:', req.body.signature?.length);

        // Check if signature is provided as base64 (from canvas)
        if (req.body.signature) {
            console.log('Attempting to save signature for user:', req.user._id);
            const user = await User.findById(req.user._id);

            if (!user) {
                console.error('User not found:', req.user._id);
                return res.status(404).json({ message: 'Utente non trovato' });
            }

            user.signature = req.body.signature; // Store base64 directly
            await user.save();
            console.log('Signature saved successfully for user:', user._id);

            return res.json({ message: 'Firma salvata con successo', signature: user.signature });
        }

        // Fallback: file upload
        if (!req.file) {
            return res.status(400).json({ message: 'Nessuna firma fornita' });
        }

        const user = await User.findById(req.user._id);
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

        const company = await Company.findById(req.user.company._id || req.user.company);
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
        const company = await Company.findById(req.user.company._id || req.user.company);
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

module.exports = {
    uploadSignature,
    upload,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateEmailConfig,
    testEmailConfig
};
