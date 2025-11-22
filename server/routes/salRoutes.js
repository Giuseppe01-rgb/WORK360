const express = require('express');
const router = express.Router();
const { createSAL, getSALs, downloadSALPDF } = require('../controllers/salController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

router.post('/', protect, requireOwner, createSAL);
router.get('/', protect, requireOwner, getSALs);
router.get('/:id/pdf', protect, requireOwner, downloadSALPDF);

module.exports = router;
