const User = require('../models/User');
const { upload } = require('./photoController');

const uploadSignature = async (req, res) => {
    try {
        console.log('=== SIGNATURE UPLOAD REQUEST ===');
        console.log('User ID:', req.user?._id);
        console.log('Has signature in body:', !!req.body.signature);
        console.log('Signature length:', req.body.signature?.length);

        // Check if signature is provided as base64 (from canvas)
        if (req.body.signature) {
            console.log('Attempting to save signature for user:', req.user._id);
            const user = await User.findById(req.user._id);

            if (!user) {
                console.error('User not found:', req.user._id);
                return res.status(404).json({ message: 'Utente non trovato' });
            }

            user.signature = req.body.signature; // Store base64 directly
            await user.save();
            console.log('Signature saved successfully for user:', user._id);

            return res.json({ message: 'Firma salvata con successo', signature: user.signature });
        }

        // Fallback: file upload
        if (!req.file) {
            return res.status(400).json({ message: 'Nessuna firma fornita' });
        }

        const user = await User.findById(req.user._id);
        user.signature = req.file.path;
        await user.save();

        res.json({ message: 'Firma caricata con successo', signature: user.signature });
    } catch (error) {
        console.error('Signature save error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadSignature, upload };
