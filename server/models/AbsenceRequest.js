const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AbsenceRequest = sequelize.define('AbsenceRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'employee_id',
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
    type: {
        type: DataTypes.ENUM('FERIE', 'PERMESSO'),
        allowNull: false
    },
    mode: {
        type: DataTypes.ENUM('HOURS', 'DAY'),
        allowNull: true,
        comment: 'Required for PERMESSO (HOURS or DAY), must be null for FERIE'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHANGES_REQUESTED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    category: {
        type: DataTypes.ENUM('PERSONALE', 'MEDICO', 'LEGGE_104', 'ALTRO'),
        allowNull: true,
        comment: 'Required if type=PERMESSO'
    },
    is104: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_104',
        comment: 'Auto-set to true when category=LEGGE_104'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'end_date'
    },
    dayPart: {
        type: DataTypes.ENUM('FULL', 'AM', 'PM'),
        allowNull: true,
        field: 'day_part',
        comment: 'For PERMESSO+DAY: required. For FERIE: only if single day. For PERMESSO+HOURS: must be null'
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'start_time',
        comment: 'Required only for PERMESSO+HOURS'
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'end_time',
        comment: 'Required only for PERMESSO+HOURS'
    },
    durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration_minutes',
        comment: 'Auto-calculated for PERMESSO+HOURS, nullable otherwise'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 1000],
                msg: 'Le note non possono superare 1000 caratteri'
            }
        }
    },
    attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'attachment_url'
    },
    decisionBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'decision_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    decisionAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'decision_at'
    },
    decisionNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'decision_note'
    },
    requestedChanges: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'requested_changes'
    },
    revisionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'revision_number'
    }
}, {
    tableName: 'absence_requests',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['employee_id', 'status'] },
        { fields: ['company_id', 'status'] },
        { fields: ['start_date'] },
        { fields: ['created_at'] }
    ]
});

module.exports = AbsenceRequest;
