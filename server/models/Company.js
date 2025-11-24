const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        street: String,
        city: String,
        province: String,
        cap: String,
        country: { type: String, default: 'Italia' }
    },
    phone: String,
    email: String,
    pec: String, // Posta Elettronica Certificata
    piva: String, // Partita IVA
    taxCode: String, // Codice Fiscale (se diverso da P.IVA)
    reaNumber: String, // Numero REA
    shareCapital: String, // Capitale Sociale (es. "10.000,00 i.v.")
    bankName: String, // Nome Banca
    iban: String, // IBAN
    logo: String, // Path to logo image
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
