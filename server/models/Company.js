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
    logo: String, // Path to logo image
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
