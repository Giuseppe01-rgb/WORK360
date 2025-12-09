const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Economia extends Model { }

Economia.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    workerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'worker_id',
        references: { model: 'users', key: 'id' }
    },
    siteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'site_id',
        references: { model: 'construction_sites', key: 'id' }
    },
    hours: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        validate: {
            min: 0.5,
            max: 24
        }
    },
    description: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        validate: {
            len: [10, 1000]
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Economia',
    tableName: 'economias',
    underscored: true,
    timestamps: true,
    // paranoid: true - Disabled until deleted_at column is added to production DB
    indexes: [
        { fields: ['worker_id', 'date'] },
        { fields: ['site_id', 'date'] },
        { fields: ['worker_id', 'site_id'] }
    ]
});

module.exports = Economia;
