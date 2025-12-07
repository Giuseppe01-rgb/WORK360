const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class MaterialMaster extends Model {
    get missingPrice() {
        return this.price === null || this.price === undefined || this.price === 0;
    }
}

MaterialMaster.init({
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
    family: {
        type: DataTypes.STRING,
        allowNull: false
    },
    spec: DataTypes.STRING,
    unit: {
        type: DataTypes.STRING,
        allowNull: false
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'display_name'
    },
    normalizedKey: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'normalized_key'
    },
    supplier: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    barcode: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    price: {
        type: DataTypes.DECIMAL(10, 2)
    },
    createdById: {
        type: DataTypes.UUID,
        field: 'created_by_id',
        references: { model: 'users', key: 'id' }
    }
}, {
    sequelize,
    modelName: 'MaterialMaster',
    tableName: 'material_masters',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['barcode'] },
        { fields: ['company_id', 'normalized_key'], unique: true }
    ]
});

module.exports = MaterialMaster;
