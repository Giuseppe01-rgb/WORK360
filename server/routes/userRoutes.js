const express = require('express');
const router = express.Router();
const {
    uploadSignature,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateEmailConfig,
    testEmailConfig
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// User management (owner only)
router.get('/', protect, getAllUsers);
router.post('/', protect, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

// Signature
router.post('/signature', protect, uploadSignature);

// Email configuration
router.put('/email-config', protect, updateEmailConfig);
router.post('/email-config/test', protect, testEmailConfig);

module.exports = router;
