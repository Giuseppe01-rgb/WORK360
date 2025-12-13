const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middleware/authMiddleware');
const siteAccountingController = require('../controllers/siteAccountingController');

// All routes require authentication and owner role
router.use(protect);
router.use(requireOwner);

// CRUD routes
router.post('/', siteAccountingController.createSiteAccounting);
router.get('/', siteAccountingController.getAllSiteAccountings);
router.get('/:id', siteAccountingController.getSiteAccountingById);
router.put('/:id', siteAccountingController.updateSiteAccounting);
router.delete('/:id', siteAccountingController.deleteSiteAccounting);
router.get('/:id/pdf', siteAccountingController.downloadSiteAccountingPDF);

module.exports = router;
