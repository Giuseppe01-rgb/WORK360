const express = require('express');
const router = express.Router();
const upload = require('../middleware/memoryUploadMiddleware');
const { uploadPhoto, getPhotos, deletePhoto } = require('../controllers/photoController');
const { protect, requireWorker } = require('../middleware/authMiddleware');

router.post('/upload', protect, requireWorker, upload.single('photo'), uploadPhoto);
router.get('/', protect, getPhotos);
router.delete('/:id', protect, deletePhoto);

module.exports = router;
