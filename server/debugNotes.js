const mongoose = require('mongoose');
const Note = require('./models/Note');
const ConstructionSite = require('./models/ConstructionSite');
require('dotenv').config();

const debugNotes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const siteName = "ROOSWOOD HOTEL";
        const site = await ConstructionSite.findOne({ name: { $regex: siteName, $options: 'i' } });

        if (!site) {
            console.log(`Site "${siteName}" not found`);
            return;
        }

        console.log(`Found site: ${site.name} (${site._id})`);

        const notes = await Note.find({ site: site._id });
        console.log(`Found ${notes.length} notes:`);
        notes.forEach(n => {
            console.log(`- ID: ${n._id}, Type: ${n.type}, Content: ${n.content.substring(0, 50)}...`);
        });

        // Check specifically for the note mentioned in the screenshot if possible
        // "Marco ROSCINI mi ha chiesto di fare la facciata..."
        const targetNote = notes.find(n => n.content.includes("Marco ROSCINI"));
        if (targetNote) {
            console.log("\nTarget Note Found:");
            console.log(targetNote);

            // Try to find by ID explicitly
            const foundById = await Note.findById(targetNote._id);
            console.log(`\nFind by ID result: ${foundById ? 'Found' : 'Not Found'}`);
        } else {
            console.log("\nTarget note with content 'Marco ROSCINI' not found in Notes collection.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugNotes();
