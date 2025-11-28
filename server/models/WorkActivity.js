const mongoose = require('mongoose');

const workActivitySchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    activityType: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        default: 'pz' // pz, m, m², stanze, etc.
    },
    percentageTime: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    durationHours: {
        type: Number,
        default: 0
    },
    notes: String
}, {
    timestamps: true
});

// Index for efficient queries
workActivitySchema.index({ company: 1, user: 1, date: 1 });
workActivitySchema.index({ company: 1, site: 1, date: 1 });

module.exports = mongoose.model('WorkActivity', workActivitySchema);
