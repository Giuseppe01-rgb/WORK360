const mongoose = require('mongoose');

const materialUsageSchema = new mongoose.Schema({
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
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ColouraMaterial',
        required: false  // Optional - null if not yet catalogued
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    numeroConfezioni: {
        type: Number,
        required: true,
        min: 1
    },
    foto: {
        type: String,  // URL to photo
        default: null
    },
    stato: {
        type: String,
        enum: ['catalogato', 'da_approvare', 'rifiutato'],
        default: 'catalogato'
    },
    materialeReportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReportedMaterial',
        default: null
    },
    note: {
        type: String,
        trim: true,
        default: ''
    },
    dataOra: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries by site and date
materialUsageSchema.index({ site: 1, dataOra: -1 });
materialUsageSchema.index({ company: 1, dataOra: -1 });
materialUsageSchema.index({ user: 1, dataOra: -1 });
materialUsageSchema.index({ stato: 1 });
materialUsageSchema.index({ materialeReportId: 1 });

module.exports = mongoose.model('MaterialUsage', materialUsageSchema);
