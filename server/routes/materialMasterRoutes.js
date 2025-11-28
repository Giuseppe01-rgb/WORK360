const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/memoryUploadMiddleware');
const {
    getMaterialCatalog,
    getMaterialByBarcode,
    createMaterialCatalogEntry,
    updateMaterialCatalogEntry,
    deleteMaterialCatalogEntry,
    uploadInvoice
} = require('../controllers/materialMasterController');

// All routes require authentication
router.use(protect);

// Get material catalog
router.get('/', getMaterialCatalog);

// Create material catalog entry
router.post('/', createMaterialCatalogEntry);

// Update material catalog entry
router.put('/:id', updateMaterialCatalogEntry);

// Delete material catalog entry
router.delete('/:id', deleteMaterialCatalogEntry);

// Get material by barcode
router.get('/barcode/:barcode', getMaterialByBarcode);

// Upload invoice for parsing (with file upload middleware)
router.post('/upload-invoice', upload.single('invoice'), uploadInvoice);

module.exports = router;
