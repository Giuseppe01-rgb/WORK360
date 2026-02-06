// Quick migration script to add hourly_cost column to attendances
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

// Use environment variable - NEVER hardcode credentials
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Set it in your .env file or Railway environment');
    process.exit(1);
}

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
