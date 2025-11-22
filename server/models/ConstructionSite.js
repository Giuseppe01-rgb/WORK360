const mongoose = require('mongoose');

const constructionSiteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    address: {
        type: String,
        required: true
    },
    client: {
        name: String,
        phone: String,
        email: String
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    actualEndDate: Date,
    status: {
        type: String,
        enum: ['planned', 'active', 'completed', 'suspended'],
        default: 'planned'
    },
    assignedWorkers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    description: String,
    notes: String
}, {
    timestamps: true
});

module.exports = mongoose.model('ConstructionSite', constructionSiteSchema);
