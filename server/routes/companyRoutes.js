const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { getCompany, updateCompany } = require('../controllers/companyController');

router.get('/', protect, requireOwner, getCompany);
router.put('/', protect, requireOwner, upload.single('logo'), updateCompany);

module.exports = router;
