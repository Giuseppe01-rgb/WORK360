const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');

const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Solo immagini sono permesse!'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 } // 5MB default
});

const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        const { siteId, type, caption } = req.body;

        const photo = await Photo.create({
            user: req.user._id,
            site: siteId,
            filename: req.file.filename,
            path: req.file.path,
            type: type || 'progress',
            caption
        });

        // Construct URL
        const protocol = req.protocol;
        const host = req.get('host');
        // Ensure forward slashes for URL
        const relativePath = req.file.path.replace(/\\/g, '/');
        const url = `${protocol}://${host}/${relativePath}`;

        // Return photo object with url
        res.status(201).json({
            ...photo.toObject(),
            url,
            photoUrl: url // For consistency
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore nel caricamento della foto', error: error.message });
    }
};

const getPhotos = async (req, res) => {
    try {
        const { siteId } = req.query;
        const query = siteId ? { site: siteId } : {};

        const photos = await Photo.find(query)
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(photos);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero delle foto', error: error.message });
    }
};

module.exports = { upload, uploadPhoto, getPhotos };
