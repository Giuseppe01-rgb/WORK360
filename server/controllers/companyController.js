const Company = require('../models/Company');
const User = require('../models/User');

// @desc    Get company data
// @route   GET /api/company
// @access  Private (Owner)
const getCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.user.company._id);
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
        const { name, ownerName, piva, phone, email, pec, address } = req.body;

        const updateData = {
            name,
            ownerName,
            piva,
            phone,
            email,
            pec,
            address: typeof address === 'string' ? JSON.parse(address) : address
        };

        if (req.file) {
            // Convert buffer to base64
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const mimeType = req.file.mimetype;
            updateData.logo = `data:${mimeType};base64,${b64}`;
        }

        const company = await Company.findByIdAndUpdate(
            req.user.company._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(company);
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento azienda', error: error.message });
    }
};

module.exports = {
    getCompany,
    updateCompany
};
