const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const salController = require('../controllers/salController');

// All routes require authentication and owner role
router.use(protect);
router.use(requireOwner);

// CRUD routes
router.post('/', salController.createSAL);
router.get('/', salController.getAllSALs);
router.get('/:id', salController.getSALById);
router.put('/:id', salController.updateSAL);
router.delete('/:id', salController.deleteSAL);
router.get('/:id/pdf', salController.downloadSALPDF);

module.exports = router;
