const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

// Fix the foreign key constraint on material_usages
// Change from coloura_materials to material_masters
router.post('/fix-material-fk', async (req, res) => {
    try {
        console.log('Starting FK migration...');

        // Drop the old foreign key constraint
        await sequelize.query(`
            ALTER TABLE material_usages 
            DROP CONSTRAINT IF EXISTS material_usages_material_id_fkey;
        `);
        console.log('Dropped old FK constraint');

        // Add new foreign key constraint to material_masters
        await sequelize.query(`
            ALTER TABLE material_usages 
            ADD CONSTRAINT material_usages_material_id_fkey 
            FOREIGN KEY (material_id) 
            REFERENCES material_masters(id) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE;
        `);
        console.log('Added new FK constraint to material_masters');

        res.json({
            success: true,
            message: 'Foreign key constraint migrated from coloura_materials to material_masters'
        });
    } catch (error) {
        console.error('FK migration error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            detail: error.parent?.detail || error.detail
        });
    }
});

// Check FK status
router.get('/check-material-fk', async (req, res) => {
    try {
        const [result] = await sequelize.query(`
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'material_usages'
                AND kcu.column_name = 'material_id';
        `);

        res.json({
            constraints: result,
            message: result.length > 0
                ? `FK points to: ${result[0].foreign_table_name}`
                : 'No FK constraint found on material_id'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
