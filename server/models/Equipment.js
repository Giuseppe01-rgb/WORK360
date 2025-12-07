const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Equipment extends Model { }

Equipment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' }
    },
    siteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    category: DataTypes.STRING,
    notes: DataTypes.TEXT,
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Equipment',
    tableName: 'equipment',
    underscored: true,
    timestamps: true
});

module.exports = Equipment;
