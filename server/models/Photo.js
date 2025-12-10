const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Photo extends Model {
    // Virtual field for photoUrl
    get photoUrl() {
        if (this.path && (this.path.startsWith('http://') || this.path.startsWith('https://'))) {
            return this.path;
        }
        return this.path;
    }
}

Photo.init({
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
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('progress', 'issue', 'other'),
        defaultValue: 'progress'
    },
    caption: {
        type: DataTypes.STRING(1000)
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    photoUrl: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.path;
        }
    }
}, {
    sequelize,
    modelName: 'Photo',
    tableName: 'photos',
    underscored: true,
    timestamps: true
});

module.exports = Photo;
