// Script to add test materials to catalog
// Run with: node addTestMaterials.js

const mongoose = require('mongoose');
require('dotenv').config();

const ColouraMaterial = require('./models/ColouraMaterial');
const Company = require('./models/Company');

const testMaterials = [
    {
        codice_prodotto: 'ST001',
        nome_prodotto: 'Stucco Rasante Bianco',
        marca: 'Colorificio Italiano',
        quantita: '25 kg',
        prezzo: 18.50,
        categoria: 'Stucco',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'ST002',
        nome_prodotto: 'Stucco Murale Interno',
        marca: 'MaxMeyer',
        quantita: '20 kg',
        prezzo: 15.90,
        categoria: 'Stucco',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'PIT001',
        nome_prodotto: 'Pittura Lavabile Bianca',
        marca: 'Colorificio Italiano',
        quantita: '14 lt',
        prezzo: 42.00,
        categoria: 'Pittura interna',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'PIT002',
        nome_prodotto: 'Pittura Antimuffa',
        marca: 'Cromology',
        quantita: '10 lt',
        prezzo: 38.50,
        categoria: 'Pittura interna',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'PIT003',
        nome_prodotto: 'Pittura Esterna Traspirante',
        marca: 'MaxMeyer',
        quantita: '15 lt',
        prezzo: 55.00,
        categoria: 'Pittura esterna',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'PRI001',
        nome_prodotto: 'Primer Aggrappante',
        marca: 'Colorificio Italiano',
        quantita: '12 lt',
        prezzo: 28.00,
        categoria: 'Primer',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'RAS001',
        nome_prodotto: 'Rasante Cementizio',
        marca: 'Kerakoll',
        quantita: '25 kg',
        prezzo: 22.50,
        categoria: 'Rasante',
        fornitore: 'Fornitore Test',
        attivo: true
    },
    {
        codice_prodotto: 'SIL001',
        nome_prodotto: 'Silicato Bianco',
        marca: 'Kerakoll',
        quantita: '14 lt',
        prezzo: 48.00,
        categoria: 'Pittura interna',
        fornitore: 'Fornitore Test',
        attivo: true
    }
];

async function addTestMaterials() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the company (assuming there's only one for now, or find by name)
        const company = await Company.findOne();

        if (!company) {
            console.error('❌ No company found in database');
            process.exit(1);
        }

        console.log(`📦 Adding materials for company: ${company.nome}`);

        // Add each material
        for (const materialData of testMaterials) {
            const material = await ColouraMaterial.create({
                ...materialData,
                company: company._id
            });
            console.log(`✅ Added: ${material.nome_prodotto} (${material.codice_prodotto})`);
        }

        console.log(`\n🎉 Successfully added ${testMaterials.length} test materials!`);
        console.log('\nNow try searching for:');
        console.log('  - "St" → Should find Stucco materials');
        console.log('  - "Pit" → Should find Pittura materials');
        console.log('  - "Max" → Should find MaxMeyer products');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addTestMaterials();
