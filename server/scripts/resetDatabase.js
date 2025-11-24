const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Company = require('../models/Company');
const ConstructionSite = require('../models/ConstructionSite');
const Attendance = require('../models/Attendance');
const Material = require('../models/Material');
const Equipment = require('../models/Equipment');
const Note = require('../models/Note');
const Photo = require('../models/Photo');
const Quote = require('../models/Quote');
const SAL = require('../models/SAL');
const Supplier = require('../models/Supplier');
const Document = require('../models/Document');

async function resetDatabase() {
    try {
        console.log('🔌 Connessione a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connesso a MongoDB\n');

        console.log('⚠️  ATTENZIONE: Stai per eliminare TUTTI i dati!');
        console.log('📋 Collections da svuotare:');
        console.log('   - Users (Utenti)');
        console.log('   - Companies (Aziende)');
        console.log('   - Sites (Cantieri)');
        console.log('   - Attendances (Presenze)');
        console.log('   - Materials (Materiali)');
        console.log('   - Equipment (Attrezzature)');
        console.log('   - Notes (Note)');
        console.log('   - Photos (Foto)');
        console.log('   - Quotes (Preventivi)');
        console.log('   - SALs (SAL)');
        console.log('   - Suppliers (Fornitori)');
        console.log('');

        // Conta i documenti prima
        const counts = {
            users: await User.countDocuments(),
            companies: await Company.countDocuments(),
            sites: await ConstructionSite.countDocuments(),
            attendances: await Attendance.countDocuments(),
            materials: await Material.countDocuments(),
            equipment: await Equipment.countDocuments(),
            notes: await Note.countDocuments(),
            photos: await Photo.countDocuments(),
            quotes: await Quote.countDocuments(),
            sals: await SAL.countDocuments(),
            suppliers: await Supplier.countDocuments(),
            documents: await Document.countDocuments(),
        };

        console.log('📊 Documenti attuali:');
        Object.entries(counts).forEach(([key, count]) => {
            console.log(`   ${key}: ${count}`);
        });
        console.log('');

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) {
            console.log('✨ Database già vuoto!');
            process.exit(0);
        }

        console.log('🗑️  Eliminazione in corso...\n');

        // Elimina tutto
        await User.deleteMany({});
        console.log('✅ Users eliminati');

        await Company.deleteMany({});
        console.log('✅ Companies eliminate');

        await ConstructionSite.deleteMany({});
        console.log('✅ Sites eliminati');

        await Attendance.deleteMany({});
        console.log('✅ Attendances eliminate');

        await Material.deleteMany({});
        console.log('✅ Materials eliminati');

        await Equipment.deleteMany({});
        console.log('✅ Equipment eliminati');

        await Note.deleteMany({});
        console.log('✅ Notes eliminate');

        await Photo.deleteMany({});
        console.log('✅ Photos eliminate');

        await Quote.deleteMany({});
        console.log('✅ Quotes eliminati');

        await SAL.deleteMany({});
        console.log('✅ SALs eliminati');

        await Supplier.deleteMany({});
        console.log('✅ Suppliers eliminati');

        await Document.deleteMany({});
        console.log('✅ Documents eliminati');

        console.log('\n🎉 Database completamente svuotato!');
        console.log('💡 Ora puoi ripartire da zero con l\'onboarding.\n');

    } catch (error) {
        console.error('❌ Errore:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnesso da MongoDB');
        process.exit(0);
    }
}

// Esegui
console.log('\n🚀 WORK360 - Database Reset Tool\n');
console.log('=====================================\n');

resetDatabase();
