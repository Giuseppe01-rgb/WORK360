const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class WorkActivity extends Model { }

WorkActivity.init({
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
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    activityType: DataTypes.STRING,
    description: DataTypes.TEXT,
    hours: DataTypes.DECIMAL(5, 2),
    notes: DataTypes.TEXT
}, {
    sequelize,
    modelName: 'WorkActivity',
    tableName: 'work_activities',
    underscored: true,
    timestamps: true
});

module.exports = WorkActivity;
