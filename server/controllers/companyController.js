const { Company, User } = require('../models');

// @desc    Get company data
// @route   GET /api/company
// @access  Private (Owner)
const getCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.user.company._id);
        if (!company) {
            return res.status(404).json({ message: 'Azienda non trovata' });
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dati azienda', error: error.message });
    }
};

// @desc    Update company data
// @route   PUT /api/company
// @access  Private (Owner)
const updateCompany = async (req, res) => {
    try {
        console.log('=== UPDATE COMPANY REQUEST ===');
        console.log('User company ID:', req.user?.company?._id);
        console.log('Request body keys:', Object.keys(req.body));
        console.log('File uploaded:', !!req.file);

        const { name, ownerName, piva, phone, email, pec, address, reaNumber, shareCapital, taxCode, bankName, iban } = req.body;

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (ownerName !== undefined) updateData.ownerName = ownerName;
        if (piva !== undefined) updateData.piva = piva;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (pec !== undefined) updateData.pec = pec;
        if (reaNumber !== undefined) updateData.reaNumber = reaNumber;
        if (shareCapital !== undefined) updateData.shareCapital = shareCapital;
        if (taxCode !== undefined) updateData.taxCode = taxCode;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (iban !== undefined) updateData.iban = iban;

        if (address) {
            updateData.address = typeof address === 'string' ? JSON.parse(address) : address;
        }

        if (req.file) {
            console.log('Processing logo upload, size:', req.file.size, 'bytes');
            try {
                const b64 = Buffer.from(req.file.buffer).toString('base64');
                const mimeType = req.file.mimetype;
                updateData.logo = `data:${mimeType};base64,${b64}`;
                console.log('Logo converted to base64, length:', updateData.logo.length);
            } catch (logoError) {
                console.error('Error converting logo to base64:', logoError);
                throw new Error('Errore nella conversione del logo');
            }
        }

        console.log('Updating company with fields:', Object.keys(updateData));

        const company = await Company.findByPk(req.user.company._id);
        if (!company) {
            throw new Error('Azienda non trovata');
        }

        await company.update(updateData);

        console.log('Company updated successfully');
        res.json(company);
    } catch (error) {
        console.error('=== COMPANY UPDATE ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: 'Errore nell\'aggiornamento azienda',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getCompany,
    updateCompany
};
