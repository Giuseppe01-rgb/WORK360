const express = require('express');
const router = express.Router();
const { createEquipment, getEquipment } = require('../controllers/equipmentController');
const { protect, requireWorker } = require('../middleware/authMiddleware');

router.post('/', protect, requireWorker, createEquipment);
router.get('/', protect, getEquipment);

module.exports = router;
