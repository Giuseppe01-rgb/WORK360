const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConstructionSite',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['progress', 'issue', 'other'],
        default: 'progress'
    },
    caption: String,
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field to provide photoUrl
photoSchema.virtual('photoUrl').get(function () {
    // If path is already a full URL (Cloudinary), return it
    if (this.path && (this.path.startsWith('http://') || this.path.startsWith('https://'))) {
        return this.path;
    }
    // For local storage, we'll just return the path
    // The frontend should handle the construction of the full URL if needed
    return this.path;
});

module.exports = mongoose.model('Photo', photoSchema);

