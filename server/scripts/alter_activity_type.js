/**
 * Migration: Alter activity_type column from VARCHAR(255) to TEXT
 * 
 * Run with: node scripts/alter_activity_type.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function alterActivityType() {
    try {
        console.log('🔧 Altering activity_type column to TEXT...');

        await sequelize.query(`
            ALTER TABLE work_activities 
            ALTER COLUMN activity_type TYPE TEXT;
        `);

        console.log('✅ Successfully altered activity_type to TEXT');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

alterActivityType();
