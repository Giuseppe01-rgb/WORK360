const express = require('express');
const router = express.Router();
const { upload, uploadPhoto, getPhotos } = require('../controllers/photoController');
const { protect, requireWorker } = require('../middleware/authMiddleware');

router.post('/upload', protect, requireWorker, upload.single('photo'), uploadPhoto);
router.get('/', protect, getPhotos);

module.exports = router;
