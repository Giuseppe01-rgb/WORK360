const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');
const ConstructionSite = require('../models/ConstructionSite');
const { assertSiteBelongsToCompany } = require('../utils/security');

const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * SECURITY INVARIANTS:
 * - All site-related operations verify site belongs to req.user.company
 * - Cross-company access attempts return 404
 * - Never expose internal error details to client
 */

// Configure Cloudinary (only if credentials are provided)
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured for photo uploads');
} else {
    console.warn('⚠️ Cloudinary not configured. Using local storage for uploads.');
}

// Configure storage based on environment
const storage = useCloudinary
    ? new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'work360-photos',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
        }
    })
    : multer.diskStorage({
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

const uploadPhoto = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        const { siteId, type, caption } = req.body;
        const companyId = req.user.company._id || req.user.company;

        // SECURITY: Verify site exists and belongs to user's company
        await assertSiteBelongsToCompany(siteId, companyId);

        // Determine the URL based on storage type
        let url;
        let photoPath;
        let filename;

        if (useCloudinary) {
            // Cloudinary provides the URL directly
            url = req.file.path; // Cloudinary path is the full URL
            photoPath = req.file.path;
            filename = req.file.filename || req.file.originalname;
        } else {
            // Local storage: construct URL
            const protocol = req.protocol;
            const host = req.get('host');
            const relativePath = req.file.path.replace(/\\/g, '/');
            url = `${protocol}://${host}/${relativePath}`;
            photoPath = req.file.path;
            filename = req.file.filename;
        }

        const photo = await Photo.create({
            user: req.user._id,
            site: siteId,
            filename: filename,
            path: photoPath,
            type: type || 'progress',
            caption
        });

        // Return photo object with url
        res.status(201).json({
            ...photo.toObject(),
            url,
            photoUrl: url // For consistency
        });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

const getPhotos = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = req.user.company._id || req.user.company;

        if (siteId) {
            // SECURITY: Verify site belongs to user's company
            await assertSiteBelongsToCompany(siteId, companyId);

            // Fetch photos for this specific site
            const photos = await Photo.find({ site: siteId })
                .populate('user', 'firstName lastName')
                .populate('site', 'name')
                .sort({ date: -1 });

            return res.json(photos);
        }

        // No siteId specified: get all photos from user's company sites
        const sites = await ConstructionSite.find({ company: companyId }).select('_id');
        const siteIds = sites.map(s => s._id);

        const photos = await Photo.find({ site: { $in: siteIds } })
            .populate('user', 'firstName lastName')
            .populate('site', 'name')
            .sort({ date: -1 });

        res.json(photos);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

module.exports = { upload, uploadPhoto, getPhotos };
