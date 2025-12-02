const mongoose = require('mongoose');

const economiaSchema = new mongoose.Schema({
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite',
        required: true
    },
    hours: {
        type: Number,
        required: true,
        min: 0.5,
        max: 24
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true
});

// Indexes for performance
economiaSchema.index({ worker: 1, date: -1 });
economiaSchema.index({ site: 1, date: -1 });
economiaSchema.index({ worker: 1, site: 1 });

module.exports = mongoose.model('Economia', economiaSchema);
