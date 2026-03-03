const express = require('express');
const router = express.Router();
const { createNote, getNotes, updateNote, deleteNote } = require('../controllers/noteController');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { validateNote } = require('../middleware/validators');

router.post('/', protect, validateNote, createNote);
router.get('/', protect, getNotes);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, requireOwner, deleteNote);

module.exports = router;
