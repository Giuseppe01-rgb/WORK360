const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    // p256dh and auth keys are sent by the browser
    p256dh: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    auth: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    // Device info for debugging
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    // Track if subscription is active
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Last successful push
    lastPushAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Track failures for cleanup
    failureCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'push_subscriptions',
    timestamps: true,
    indexes: [
        {
            fields: ['userId']
        },
        {
            unique: true,
            fields: ['endpoint']
        },
        {
            fields: ['isActive']
        }
    ]
});

module.exports = PushSubscription;
