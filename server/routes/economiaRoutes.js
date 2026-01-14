const express = require('express');
const router = express.Router();
const { protect, requireWorker, requireOwner } = require('../middleware/authMiddleware');
const { validateEconomiaCreate } = require('../middleware/validators');
const economiaController = require('../controllers/economiaController');

// Worker routes
router.post('/', protect, requireWorker, validateEconomiaCreate, economiaController.createEconomia);
router.get('/my', protect, requireWorker, economiaController.getMyEconomie);
router.put('/:id', protect, requireWorker, economiaController.updateEconomia);
router.delete('/my/:id', protect, requireWorker, economiaController.deleteMyEconomia);

// Owner routes
router.get('/site/:siteId', protect, requireOwner, economiaController.getEconomiesBySite);
router.post('/bulk', protect, requireOwner, economiaController.createBulkEconomia); // Quick bulk entry
router.delete('/:id', protect, requireOwner, economiaController.deleteEconomia);

module.exports = router;

