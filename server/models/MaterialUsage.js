const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class MaterialUsage extends Model { }

MaterialUsage.init({
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
    siteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    materialId: {
        type: DataTypes.UUID,
        field: 'material_id',
        references: { model: 'coloura_materials', key: 'id' }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' }
    },
    numeroConfezioni: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'numero_confezioni',
        validate: { min: 1 }
    },
    foto: {
        type: DataTypes.STRING
    },
    stato: {
        type: DataTypes.ENUM('catalogato', 'da_approvare', 'rifiutato'),
        defaultValue: 'catalogato'
    },
    materialeReportId: {
        type: DataTypes.UUID,
        field: 'materiale_report_id',
        references: { model: 'reported_materials', key: 'id' }
    },
    note: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    dataOra: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'data_ora'
    }
}, {
    sequelize,
    modelName: 'MaterialUsage',
    tableName: 'material_usages',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['site_id', 'data_ora'] },
        { fields: ['company_id', 'data_ora'] },
        { fields: ['user_id', 'data_ora'] },
        { fields: ['stato'] },
        { fields: ['materiale_report_id'] }
    ]
});

module.exports = MaterialUsage;
