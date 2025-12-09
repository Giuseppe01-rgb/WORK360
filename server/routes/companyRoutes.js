const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const upload = require('../middleware/memoryUploadMiddleware');
const { getCompany, updateCompany } = require('../controllers/companyController');
const { exportCompanyData } = require('../controllers/companyExportController');

router.get('/', protect, requireOwner, getCompany);
router.put('/', protect, requireOwner, upload.single('logo'), updateCompany);
router.get('/export', protect, requireOwner, exportCompanyData);

module.exports = router;
