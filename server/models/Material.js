const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Material extends Model { }

Material.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    siteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'site_id',
        references: {
            model: 'construction_sites',
            key: 'id'
        }
    },
    companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'company_id',
        references: {
            model: 'companies',
            key: 'id'
        }
    },
    materialMasterId: {
        type: DataTypes.UUID,
        field: 'material_master_id',
        references: {
            model: 'material_masters',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING,
        defaultValue: 'pz'
    },
    category: {
        type: DataTypes.STRING
    },
    notes: {
        type: DataTypes.TEXT
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Material',
    tableName: 'materials',
    underscored: true,
    timestamps: true
});

module.exports = Material;
