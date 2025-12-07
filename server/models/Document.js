const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Document extends Model { }

Document.init({
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
    type: {
        type: DataTypes.ENUM('estimate', 'sal'),
        allowNull: false
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    siteId: {
        type: DataTypes.UUID,
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    client: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    items: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    total: DataTypes.DECIMAL(12, 2),
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'approved'),
        defaultValue: 'draft'
    }
}, {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    underscored: true,
    timestamps: true
});

module.exports = Document;
