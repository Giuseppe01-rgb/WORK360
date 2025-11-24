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

    // Identification
    number: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },

    // Period of Work
    periodStart: {
        type: Date,
        required: true
    },
    periodEnd: {
        type: Date,
        required: true
    },

    // Client/Committente Information
    client: {
        name: { type: String, required: true },
        fiscalCode: String,
        address: String,
        vatNumber: String
    },

    // Work Description
    workDescription: {
        type: String,
        required: true
    },

    // Financial Details
    contractValue: {
        type: Number,
        required: true
    },
    previousAmount: {
        type: Number,
        default: 0
    },
    currentAmount: {
        type: Number,
        required: true
    },
    completionPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    // Legal Financial Calculations
    retentionAmount: Number,      // Ritenuta di garanzia (10%)
    penalties: {
        type: Number,
        default: 0
    },
    netAmount: Number,            // Importo netto (currentAmount - retention - penalties)

    // VAT
    vatRate: {
        type: Number,
        default: 22
    },
    vatAmount: Number,
    totalAmount: Number,          // Total with VAT

    // Work Supervisor (Direttore Lavori) - Optional
    workSupervisor: {
        name: String,
        qualification: String
    },

    // Public Contract Codes (Optional)
    cig: String,                  // Codice Identificativo Gara
    cup: String,                  // Codice Unico Progetto

    // Additional Info
    notes: String,
    status: {
        type: String,
        enum: ['draft', 'approved', 'paid'],
        default: 'draft'
    },

    // Legacy fields (kept for backwards compatibility)
    description: String,
    amount: Number,
    signature: String
}, {
    timestamps: true
});

// Pre-save middleware to calculate financial fields
salSchema.pre('save', function (next) {
    // Calculate retention (10% of current amount)
    this.retentionAmount = this.currentAmount * 0.10;

    // Calculate net amount (before VAT)
    this.netAmount = this.currentAmount - this.retentionAmount - (this.penalties || 0);

    // Calculate VAT
    this.vatAmount = this.netAmount * (this.vatRate / 100);

    // Calculate total with VAT
    this.totalAmount = this.netAmount + this.vatAmount;

    // Legacy compatibility
    if (!this.description) this.description = this.workDescription;
    if (!this.amount) this.amount = this.totalAmount;

    next();
});

module.exports = mongoose.model('SAL', salSchema);

module.exports = mongoose.model('SAL', salSchema);
