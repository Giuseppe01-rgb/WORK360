const mongoose = require('mongoose');

const reportedMaterialSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fotoUrl: {
        type: String,
        required: true
    },
    codiceLetto: {
        type: String,
        trim: true,
        default: ''
    },
    nomeDigitato: {
        type: String,
        required: true,
        trim: true
    },
    categoriaDigitata: {
        type: String,
        enum: ['Pittura interna', 'Pittura esterna', 'Stucco', 'Primer', 'Rasante', 'Altro'],
        default: 'Altro'
    },
    numeroConfezioni: {
        type: Number,
        required: true,
        min: 1
    },
    stato: {
        type: String,
        enum: ['da_approvare', 'approvato', 'rifiutato'],
        default: 'da_approvare'
    },
    materialeIdDefinitivo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ColouraMaterial',
        default: null
    },
    noteApprovazione: {
        type: String,
        trim: true,
        default: ''
    },
    approvatoDa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    dataOra: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient admin queries
reportedMaterialSchema.index({ company: 1, stato: 1, dataOra: -1 });
reportedMaterialSchema.index({ site: 1, dataOra: -1 });

module.exports = mongoose.model('ReportedMaterial', reportedMaterialSchema);
