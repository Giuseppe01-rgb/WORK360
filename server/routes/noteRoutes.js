const express = require('express');
const router = express.Router();
const { createNote, getNotes } = require('../controllers/noteController');
const { protect, requireWorker } = require('../middleware/authMiddleware');

router.post('/', protect, requireWorker, createNote);
router.get('/', protect, getNotes);

module.exports = router;
