const express = require('express');
const router = express.Router();
const { createQuote, getQuotes, getQuote, downloadQuotePDF, updateQuote, deleteQuote } = require('../controllers/quoteController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

router.post('/', protect, requireOwner, createQuote);
router.get('/', protect, requireOwner, getQuotes);
router.get('/:id', protect, requireOwner, getQuote);
router.put('/:id', protect, requireOwner, updateQuote);
router.delete('/:id', protect, requireOwner, deleteQuote);
router.get('/:id/pdf', protect, requireOwner, downloadQuotePDF);

module.exports = router;
