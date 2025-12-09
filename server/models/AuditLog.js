/**
 * AuditLog Model
 * Tracks all important actions for audit trail
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AuditLog extends Model { }

AuditLog.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id',
        references: {
            model: 'users',
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
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    targetType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'target_type'
    },
    targetId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'target_id'
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address'
    },
    meta: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    }
}, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
    indexes: [
        { fields: ['company_id', 'created_at'] },
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['target_type'] }
    ]
});

module.exports = AuditLog;
