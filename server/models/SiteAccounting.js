const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class SiteAccounting extends Model { }

SiteAccounting.init({
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
        allowNull: true, // Optional - subcontractors may not have site in system
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    number: {
        type: DataTypes.STRING,
        allowNull: true // "Numero SAL" - optional
    },
    issueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'issue_date'
    },
    periodStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'period_start'
    },
    periodEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'period_end'
    },
    client: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
            name: '',
            vatNumber: '',
            fiscalCode: '',
            address: ''
        }
    },
    items: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'SiteAccounting',
    tableName: 'site_accountings',
    underscored: true,
    timestamps: true
});

module.exports = SiteAccounting;
