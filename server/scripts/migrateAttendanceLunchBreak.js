/**
 * Migration script: Apply lunch break deduction to all existing attendances
 * 
 * This script recalculates totalHours for ALL existing attendances using the new rule:
 * - If presence >= 6 hours → deduct 1 hour lunch break
 * - If presence < 6 hours → no deduction
 * 
 * Run this script ONCE after deploying the new logic.
 * Command: node server/scripts/migrateAttendanceLunchBreak.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { Attendance } = require('../models');
const { calculateWorkedHours } = require('../utils/workedHoursCalculator');

async function migrateAttendances() {
    console.log('===========================================');
    console.log('Migration: Apply Lunch Break Deduction');
    console.log('===========================================\n');

    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✓ Database connection established\n');

        // Get all attendances with both clockIn and clockOut
        const attendances = await Attendance.findAll({
            where: {
                clockOut: { [require('sequelize').Op.not]: null }
            }
        });

        console.log(`Found ${attendances.length} completed attendances to process\n`);

        let updated = 0;
        let unchanged = 0;
        let errors = 0;

        for (const attendance of attendances) {
            try {
                const clockIn = attendance.clockIn?.time;
                const clockOut = attendance.clockOut?.time;

                if (!clockIn || !clockOut) {
                    console.log(`  [SKIP] Attendance ${attendance.id}: missing timestamps`);
                    unchanged++;
                    continue;
                }

                // Calculate with new lunch break rule
                const { workedHours, presenceHours, lunchBreakApplied } = calculateWorkedHours(clockIn, clockOut);
                const oldHours = parseFloat(attendance.totalHours) || 0;

                // Only update if there's a difference
                if (Math.abs(oldHours - workedHours) > 0.01) {
                    await Attendance.update(
                        { totalHours: workedHours },
                        { where: { id: attendance.id } }
                    );
                    console.log(`  [UPDATED] Attendance ${attendance.id}: ${oldHours}h → ${workedHours}h (presence: ${presenceHours}h, lunch break: ${lunchBreakApplied ? 'YES' : 'NO'})`);
                    updated++;
                } else {
                    unchanged++;
                }
            } catch (err) {
                console.error(`  [ERROR] Attendance ${attendance.id}: ${err.message}`);
                errors++;
            }
        }

        console.log('\n===========================================');
        console.log('Migration Complete');
        console.log('===========================================');
        console.log(`  Updated: ${updated}`);
        console.log(`  Unchanged: ${unchanged}`);
        console.log(`  Errors: ${errors}`);
        console.log(`  Total: ${attendances.length}`);

    } catch (error) {
        console.error('\nMigration failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run the migration
migrateAttendances().then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
}).catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
