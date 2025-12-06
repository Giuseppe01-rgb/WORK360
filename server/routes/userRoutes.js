const express = require('express');
const router = express.Router();
const {
    uploadSignature,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    updateEmailConfig,
    testEmailConfig,
    changePassword,
    resetUserPassword
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Signature (must be before /:id routes)
router.post('/signature', protect, uploadSignature);

// Email configuration (must be before /:id routes)
router.put('/email-config', protect, updateEmailConfig);
router.post('/email-config/test', protect, testEmailConfig);

// Password change (any authenticated user)
router.post('/change-password', protect, changePassword);

// User management (owner only) - parameterized routes come last
router.get('/', protect, getAllUsers);
router.post('/', protect, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);
router.post('/:id/reset-password', protect, resetUserPassword);

module.exports = router;
