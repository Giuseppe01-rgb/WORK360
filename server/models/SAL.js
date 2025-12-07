const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class SAL extends Model { }

SAL.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
        references: { model: 'users', key: 'id' }
    },
    siteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    periodStart: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'period_start'
    },
    periodEnd: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'period_end'
    },
    client: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    items: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    subtotal: DataTypes.DECIMAL(12, 2),
    vatRate: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'vat_rate'
    },
    vatAmount: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'vat_amount'
    },
    total: DataTypes.DECIMAL(12, 2),
    notes: DataTypes.TEXT,
    signature: DataTypes.STRING
}, {
    sequelize,
    modelName: 'SAL',
    tableName: 'sals',
    underscored: true,
    timestamps: true
});

module.exports = SAL;
