const express = require('express');
const router = express.Router();
const { protect, requireWorker, requireOwner } = require('../middleware/authMiddleware');
const economiaController = require('../controllers/economiaController');

// Worker routes
router.post('/', protect, requireWorker, economiaController.createEconomia);

// Owner routes
router.get('/site/:siteId', protect, requireOwner, economiaController.getEconomiesBySite);
router.delete('/:id', protect, requireOwner, economiaController.deleteEconomia);

module.exports = router;
