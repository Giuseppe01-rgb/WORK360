const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Supplier extends Model { }

Supplier.init({
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contact: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    materials: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        validate: { min: 0, max: 5 }
    },
    notes: DataTypes.TEXT,
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'Supplier',
    tableName: 'suppliers',
    underscored: true,
    timestamps: true
});

module.exports = Supplier;
