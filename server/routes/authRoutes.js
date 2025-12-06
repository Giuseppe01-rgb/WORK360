const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', register);
router.post('/login', loginLimiter, login); // Rate limited: 10 attempts per 15 minutes

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
