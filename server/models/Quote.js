const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Quote extends Model { }

Quote.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'company_id',
        references: { model: 'companies', key: 'id' }
    },
    client: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    items: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    vatRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 22,
        field: 'vat_rate'
    },
    vatAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'vat_amount'
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    },
    validityDays: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        field: 'validity_days'
    },
    paymentTerms: {
        type: DataTypes.TEXT,
        field: 'payment_terms'
    },
    safetyCosts: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'safety_costs'
    },
    workDuration: {
        type: DataTypes.STRING,
        field: 'work_duration'
    },
    legalNotes: {
        type: DataTypes.TEXT,
        field: 'legal_notes'
    },
    notes: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected'),
        defaultValue: 'draft'
    },
    signature: {
        type: DataTypes.STRING
    }
}, {
    sequelize,
    modelName: 'Quote',
    tableName: 'quotes',
    underscored: true,
    timestamps: true
});

module.exports = Quote;
