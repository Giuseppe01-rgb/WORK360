const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ReportedMaterial extends Model { }

ReportedMaterial.init({
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
    fotoUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'foto_url'
    },
    codiceLetto: {
        type: DataTypes.STRING,
        defaultValue: '',
        field: 'codice_letto'
    },
    nomeDigitato: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'nome_digitato'
    },
    categoriaDigitata: {
        type: DataTypes.ENUM('Pittura interna', 'Pittura esterna', 'Stucco', 'Primer', 'Rasante', 'Altro'),
        defaultValue: 'Altro',
        field: 'categoria_digitata'
    },
    numeroConfezioni: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'numero_confezioni',
        validate: { min: 1 }
    },
    stato: {
        type: DataTypes.ENUM('da_approvare', 'approvato', 'rifiutato'),
        defaultValue: 'da_approvare'
    },
    materialeIdDefinitivo: {
        type: DataTypes.UUID,
        field: 'materiale_id_definitivo',
        references: { model: 'coloura_materials', key: 'id' }
    },
    noteApprovazione: {
        type: DataTypes.TEXT,
        defaultValue: '',
        field: 'note_approvazione'
    },
    approvatoDa: {
        type: DataTypes.UUID,
        field: 'approvato_da',
        references: { model: 'users', key: 'id' }
    },
    dataOra: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'data_ora'
    }
}, {
    sequelize,
    modelName: 'ReportedMaterial',
    tableName: 'reported_materials',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['company_id', 'stato', 'data_ora'] },
        { fields: ['site_id', 'data_ora'] }
    ]
});

module.exports = ReportedMaterial;
