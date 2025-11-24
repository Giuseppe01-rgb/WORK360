const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    client: {
        name: { type: String, required: true },
        address: String,
        email: String,
        vatNumber: String,
        phone: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    number: {
        type: String,
        required: true
    },
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    subtotal: { type: Number, required: true },
    vatRate: { type: Number, default: 22 },
    vatAmount: { type: Number, required: true },
    total: { type: Number, required: true },

    // Contract Terms
    validityDays: { type: Number, default: 30 },
    paymentTerms: String,
    safetyCosts: { type: Number, default: 0 },
    workDuration: String,
    legalNotes: String,

    notes: String,
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected'],
        default: 'draft'
    },
    signature: String // Path to signature image
}, {
    timestamps: true
});

module.exports = mongoose.model('Quote', quoteSchema);
