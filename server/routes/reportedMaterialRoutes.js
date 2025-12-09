const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validateReportMaterial } = require('../middleware/validators');
const {
    reportNewMaterial,
    getReportedMaterials,
    approveAndCreateNew,
    approveAndAssociate,
    rejectMaterial
} = require('../controllers/reportedMaterialController');

// All routes require authentication
router.use(protect);

// Worker: Report new material (segnalazione flow)
router.post('/', validateReportMaterial, reportNewMaterial);

// Admin: Get all reported materials
router.get('/', getReportedMaterials);

// Admin: Approve and create new material in catalog
router.patch('/:id/approve-new', approveAndCreateNew);

// Admin: Approve and associate to existing material
router.patch('/:id/approve-associate', approveAndAssociate);

// Admin: Reject
router.patch('/:id/reject', rejectMaterial);

module.exports = router;
