const mongoose = require('mongoose');

const salSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        default: Date.now
    },
    number: {
        type: String,
        required: true
    },
    description: { type: String, required: true },
    completionPercentage: { type: Number, required: true },
    amount: { type: Number, required: true },
    notes: String,
    status: {
        type: String,
        enum: ['draft', 'approved'],
        default: 'draft'
    },
    signature: String // Path to signature image
}, {
    timestamps: true
});

module.exports = mongoose.model('SAL', salSchema);
