const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/memoryUploadMiddleware');
const {
    getAllMaterials,
    searchMaterials,
    getMaterialByCode,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    deleteAllMaterials,
    importFromExcel
} = require('../controllers/colouraMaterialController');

// All routes require authentication
router.use(protect);

// Import from Excel/CSV
router.post('/import', upload.single('file'), importFromExcel);

// Search materials
router.get('/search', searchMaterials);

// Get material by product code
router.get('/code/:code', getMaterialByCode);

// Delete ALL materials
router.delete('/all', deleteAllMaterials);

// CRUD operations
router.route('/')
    .get(getAllMaterials)
    .post(createMaterial);

router.route('/:id')
    .put(updateMaterial)
    .delete(deleteMaterial);

module.exports = router;
