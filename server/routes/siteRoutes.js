const express = require('express');
const router = express.Router();
const { createSite, getSites, getSite, updateSite, deleteSite } = require('../controllers/siteController');
const { protect, requireOwner } = require('../middleware/authMiddleware');
const { validateCreateSite, validateUpdateSite } = require('../middleware/validators');

router.post('/', protect, requireOwner, validateCreateSite, createSite);
router.get('/', protect, getSites);
router.get('/:id', protect, getSite);
router.put('/:id', protect, requireOwner, validateUpdateSite, updateSite);
router.delete('/:id', protect, requireOwner, deleteSite);

module.exports = router;
