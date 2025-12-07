const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Company extends Model { }

Company.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ownerName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'owner_name'
    },
    // Address as JSONB for PostgreSQL (nested object)
    address: {
        type: DataTypes.JSONB,
        defaultValue: {
            street: null,
            city: null,
            province: null,
            cap: null,
            country: 'Italia'
        }
    },
    phone: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            isEmail: true
        }
    },
    pec: {
        type: DataTypes.STRING
    },
    piva: {
        type: DataTypes.STRING
    },
    taxCode: {
        type: DataTypes.STRING,
        field: 'tax_code'
    },
    reaNumber: {
        type: DataTypes.STRING,
        field: 'rea_number'
    },
    shareCapital: {
        type: DataTypes.STRING,
        field: 'share_capital'
    },
    bankName: {
        type: DataTypes.STRING,
        field: 'bank_name'
    },
    iban: {
        type: DataTypes.STRING
    },
    logo: {
        type: DataTypes.STRING
    },
    // Email configuration as JSONB
    emailConfig: {
        type: DataTypes.JSONB,
        defaultValue: {
            service: 'gmail',
            host: null,
            port: 587,
            user: null,
            password: null,
            fromName: null,
            configured: false
        },
        field: 'email_config'
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    underscored: true,
    timestamps: true
});

module.exports = Company;
