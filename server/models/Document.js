const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    type: {
        type: String,
        enum: ['estimate', 'sal'], // preventivo, stato avanzamento lavori
        required: true
    },
    number: {
        type: String,
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite'
    },
    client: {
        name: { type: String, required: true },
        address: String,
        phone: String,
        email: String,
        piva: String
    },
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: 'pz' },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 22 // IVA 22%
    },
    taxAmount: Number,
    total: {
        type: Number,
        required: true
    },
    notes: String,
    pdfPath: String,
    sentAt: Date,
    sentTo: String,
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected'],
        default: 'draft'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
