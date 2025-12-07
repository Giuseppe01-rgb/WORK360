const { Photo, ConstructionSite } = require('../models');
const { assertSiteBelongsToCompany } = require('../utils/security');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Multer config (keep existing)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_PATH || './uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `photo-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo immagini sono permesse (jpeg, jpg, png, gif)'));
    }
});

const uploadPhoto = async (req, res, next) => {
    try {
        const { siteId, caption, type } = req.body;
        const companyId = req.user.company._id || req.user.company;

        if (siteId) {
            await assertSiteBelongsToCompany(siteId, companyId);
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        let photoPath = req.file.path;

        // Cloudinary upload if configured
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'work360/photos'
            });
            photoPath = result.secure_url;
        }

        const photo = await Photo.create({
            userId: req.user._id,
            siteId: siteId || null,
            filename: req.file.filename,
            path: photoPath,
            type: type || 'progress',
            caption
        });

        res.status(201).json(photo);
    } catch (error) {
        next(error);
    }
};

const getPhotos = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = req.user.company._id || req.user.company;

        let photos;

        if (siteId) {
            await assertSiteBelongsToCompany(siteId, companyId);
            photos = await Photo.findAll({
                where: { siteId },
                order: [['createdAt', 'DESC']]
            });
        } else {
            // Get photos for all company sites
            const sites = await ConstructionSite.findAll({
                where: { companyId },
                attributes: ['id']
            });
            const siteIds = sites.map(s => s.id);

            photos = await Photo.findAll({
                where: { siteId: siteIds },
                order: [['createdAt', 'DESC']]
            });
        }

        res.json(photos);
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadPhoto, getPhotos, upload };
