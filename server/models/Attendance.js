const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Attendance extends Model { }

Attendance.init({
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
    // Clock in as JSONB
    clockIn: {
        type: DataTypes.JSONB,
        allowNull: false,
        field: 'clock_in',
        validate: {
            hasRequiredFields(value) {
                if (!value.time || !value.location) {
                    throw new Error('clockIn must have time and location');
                }
            }
        }
    },
    // Clock out as JSONB
    clockOut: {
        type: DataTypes.JSONB,
        field: 'clock_out'
    },
    totalHours: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: 'total_hours'
    },
    notes: {
        type: DataTypes.TEXT
    }
}, {
    sequelize,
    modelName: 'Attendance',
    tableName: 'attendances',
    underscored: true,
    timestamps: true
});

module.exports = Attendance;
