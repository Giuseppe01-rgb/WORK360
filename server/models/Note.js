const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Note extends Model { }

Note.init({
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
    type: {
        type: DataTypes.ENUM('note', 'daily_report'),
        defaultValue: 'note'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Note',
    tableName: 'notes',
    underscored: true,
    timestamps: true
});

module.exports = Note;
