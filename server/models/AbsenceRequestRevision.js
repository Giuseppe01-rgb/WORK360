const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AbsenceRequestRevision = sequelize.define('AbsenceRequestRevision', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    absenceRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'absence_request_id',
        references: {
            model: 'absence_requests',
            key: 'id'
        }
    },
    revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'revision_number'
    },
    changedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'changed_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    changes: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: 'Snapshot of before/after field values. Using JSON (not JSONB) for DB portability.'
    }
}, {
    tableName: 'absence_request_revisions',
    underscored: true,
    timestamps: true,
    updatedAt: false
});

module.exports = AbsenceRequestRevision;
