const mongoose = require('mongoose');

const salSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite',
        required: true
    },
    number: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },
    client: {
        name: {
            type: String,
            required: true
        },
        vatNumber: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        }
    },
    contractValue: {
        type: Number,
        required: true,
        min: 0
    },
    previousAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    currentAmount: {
        type: Number,
        required: true,
        min: 0
    },
    completionPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    penalties: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for faster queries
salSchema.index({ owner: 1, site: 1 });
salSchema.index({ number: 1 });

module.exports = mongoose.model('SAL', salSchema);
