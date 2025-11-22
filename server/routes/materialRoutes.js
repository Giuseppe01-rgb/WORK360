const express = require('express');
const router = express.Router();
const { createMaterial, getMaterials } = require('../controllers/materialController');
const { protect, requireWorker } = require('../middleware/authMiddleware');

router.post('/', protect, requireWorker, createMaterial);
router.get('/', protect, getMaterials);

module.exports = router;
