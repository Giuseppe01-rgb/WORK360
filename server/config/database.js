const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connection established successfully');
    } catch (error) {
        console.error('❌ Unable to connect to PostgreSQL:', error);
        throw error;
    }
};

module.exports = { sequelize, testConnection };
