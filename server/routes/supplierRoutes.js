const express = require('express');
const router = express.Router();
const {
    createSupplier,
    getSuppliers,
    updateSupplier,
    recommendSupplier
} = require('../controllers/supplierController');
const { protect, requireOwner } = require('../middleware/authMiddleware');

router.post('/', protect, requireOwner, createSupplier);
router.get('/', protect, requireOwner, getSuppliers);
router.put('/:id', protect, requireOwner, updateSupplier);
router.post('/recommend', protect, requireOwner, recommendSupplier);

module.exports = router;
