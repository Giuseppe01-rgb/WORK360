const mongoose = require('mongoose');

const materialMasterSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    family: {
        type: String, // e.g., "nastro", "stucco"
        required: true,
        trim: true,
        lowercase: true
    },
    spec: {
        type: String, // e.g., "48mm", "in polvere"
        trim: true,
        lowercase: true
    },
    unit: {
        type: String, // e.g., "pz", "kg"
        required: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String, // e.g., "Nastro 48mm"
        required: true
    },
    normalizedKey: {
        type: String, // e.g., "nastro|48mm|pz"
        required: true
    }
}, {
    timestamps: true
});

// Ensure unique materials per company
materialMasterSchema.index({ company: 1, normalizedKey: 1 }, { unique: true });

module.exports = mongoose.model('MaterialMaster', materialMasterSchema);
