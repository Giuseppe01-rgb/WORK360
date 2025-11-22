const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        name: String,
        phone: String,
        email: String,
        address: String
    },
    materials: [{
        name: String,
        category: String,
        minPrice: Number,
        maxPrice: Number,
        averagePrice: Number
    }],
    qualityRating: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    deliveryTime: {
        type: Number, // days
        default: 7
    },
    paymentTerms: String,
    notes: String,
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
