const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ColouraMaterial extends Model { }

ColouraMaterial.init({
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
    codiceProdotto: {
        type: DataTypes.STRING,
        field: 'codice_prodotto'
    },
    marca: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nomeProdotto: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'nome_prodotto'
    },
    quantita: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    prezzo: {
        type: DataTypes.DECIMAL(10, 2)
    },
    fornitore: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Altro'
    },
    attivo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    createdById: {
        type: DataTypes.UUID,
        field: 'created_by_id',
        references: { model: 'users', key: 'id' }
    }
}, {
    sequelize,
    modelName: 'ColouraMaterial',
    tableName: 'coloura_materials',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['company_id'] },
        { fields: ['codice_prodotto'] },
        {
            fields: ['company_id', 'codice_prodotto'],
            unique: true,
            where: { codice_prodotto: { [require('sequelize').Op.ne]: '' } }
        }
    ]
});

module.exports = ColouraMaterial;
