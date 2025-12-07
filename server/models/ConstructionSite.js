const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ConstructionSite extends Model { }

ConstructionSite.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
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
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Client info as JSONB
    client: {
        type: DataTypes.JSONB,
        defaultValue: {
            name: null,
            phone: null,
            email: null
        }
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATE,
        field: 'end_date'
    },
    actualEndDate: {
        type: DataTypes.DATE,
        field: 'actual_end_date'
    },
    status: {
        type: DataTypes.ENUM('planned', 'active', 'completed', 'suspended'),
        defaultValue: 'planned'
    },
    // Assigned workers - will use join table
    description: {
        type: DataTypes.TEXT
    },
    notes: {
        type: DataTypes.TEXT
    },
    contractValue: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: null,
        field: 'contract_value',
        validate: {
            min: 0
        }
    }
}, {
    sequelize,
    modelName: 'ConstructionSite',
    tableName: 'construction_sites',
    underscored: true,
    timestamps: true
});

module.exports = ConstructionSite;
