// Quick migration script to add hourly_cost column to attendances
const { Sequelize } = require('sequelize');

// Use the public Railway URL
const DATABASE_URL = 'postgresql://postgres:sFDJXIvRPQBgMIaCqfzebMSwDPromkZf@yamanote.proxy.rlwy.net:38526/railway';

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: console.log
});

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        await sequelize.query(`
            ALTER TABLE attendances 
            ADD COLUMN IF NOT EXISTS hourly_cost DECIMAL(10, 2) DEFAULT NULL;
        `);

        console.log('✅ Migration completed: hourly_cost column added to attendances');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

migrate();
