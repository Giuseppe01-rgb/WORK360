const express = require('express');
const router = express.Router();
const { uploadSignature } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Accept both base64 (body) and file upload
router.post('/signature', protect, uploadSignature);

module.exports = router;
