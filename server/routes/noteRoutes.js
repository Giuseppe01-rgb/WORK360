const express = require('express');
const router = express.Router();
const { createNote, getNotes, deleteNote } = require('../controllers/noteController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

router.post('/', protect, createNote);
router.get('/', protect, getNotes);
router.delete('/:id', protect, requireOwner, deleteNote);

module.exports = router;
