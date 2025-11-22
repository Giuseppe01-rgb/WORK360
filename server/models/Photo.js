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
    timestamps: true
});

module.exports = mongoose.model('Photo', photoSchema);
