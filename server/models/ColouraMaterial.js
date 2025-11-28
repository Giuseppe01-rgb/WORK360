const mongoose = require('mongoose');

const colouraMaterialSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    codice_prodotto: {
        type: String,
        trim: true,
        uppercase: true,
        index: true
    },
    marca: {
        type: String,
        required: true,
        trim: true
    },
    nome_prodotto: {
        type: String,
        required: true,
        trim: true
    },
    quantita: {
        type: String,
        trim: true,
        default: ''
    },
    prezzo: {
        type: Number,
        default: null
    },
    fornitore: {
        type: String,
        trim: true,
        default: ''
    },
    categoria: {
        type: String,
        required: true,
        trim: true,
        default: 'Altro'
    },
    attivo: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index for company + product code uniqueness
colouraMaterialSchema.index(
    { company: 1, codice_prodotto: 1 },
    {
        unique: true,
        partialFilterExpression: { codice_prodotto: { $type: "string", $ne: "" } }
    }
);

module.exports = mongoose.model('ColouraMaterial', colouraMaterialSchema);
