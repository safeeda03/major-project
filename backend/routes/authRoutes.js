const express = require('express');
const router = express.Router();
const { login, logout, register } = require('../controllers/authController');

// Login route
router.post('/login', login);

// Logout route
router.post('/logout', logout);

// Register route (admin only)
router.post('/register', register);

module.exports = router;