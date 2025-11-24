const express = require('express');
const router = express.Router();
const {
    uploadSignature,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// User management (owner only)
router.get('/', protect, getAllUsers);
router.post('/', protect, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

// Signature
router.post('/signature', protect, uploadSignature);

module.exports = router;
