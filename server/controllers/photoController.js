const { Photo, ConstructionSite } = require('../models');
const { getCompanyId, getUserId } = require('../utils/sequelizeHelpers');
const { assertSiteBelongsToCompany } = require('../utils/security');
const cloudinary = require('cloudinary').v2;
const upload = require('../middleware/memoryUploadMiddleware');

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || 'work360/photos',
                resource_type: 'image'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

const uploadPhoto = async (req, res, next) => {
    try {
        const { siteId, caption, type } = req.body;
        const companyId = getCompanyId(req);

        if (siteId) {
            await assertSiteBelongsToCompany(siteId, companyId);
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nessun file caricato' });
        }

        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            console.error('Cloudinary is not configured. CLOUDINARY_CLOUD_NAME is missing.');
            return res.status(500).json({
                message: 'Upload foto non disponibile. Contatta l\'amministratore per configurare il servizio di storage.'
            });
        }

        // Upload to Cloudinary from memory buffer
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'work360/photos'
        });

        const photoPath = result.secure_url;

        const photo = await Photo.create({
            userId: getUserId(req),
            siteId: siteId, // siteId is required - don't default to null
            filename: req.file.originalname || `photo-${Date.now()}.jpg`,
            path: photoPath,
            type: type || 'progress',
            caption
        });

        res.status(201).json(photo);
    } catch (error) {
        console.error('Photo upload error:', error);
        next(error);
    }
};

const getPhotos = async (req, res, next) => {
    try {
        const { siteId } = req.query;
        const companyId = getCompanyId(req);

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

const deletePhoto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const companyId = getCompanyId(req);

        // Find the photo
        const photo = await Photo.findByPk(id);
        if (!photo) {
            return res.status(404).json({ message: 'Foto non trovata' });
        }

        // Verify site belongs to company
        await assertSiteBelongsToCompany(photo.siteId, companyId);

        // Delete from Cloudinary if it's a Cloudinary URL
        if (photo.path && photo.path.includes('cloudinary.com')) {
            try {
                // Extract public_id from Cloudinary URL
                const urlParts = photo.path.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const publicId = `work360/photos/${filenameWithExt.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Error deleting from Cloudinary:', cloudinaryError);
                // Continue with database deletion even if Cloudinary fails
            }
        }

        await photo.destroy();
        res.json({ message: 'Foto eliminata con successo' });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadPhoto, getPhotos, deletePhoto, upload };
