const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const { authenticate, checkTenant } = require('../middleware/auth');

// Public routes (no authentication)
router.post('/forgot-password', passwordController.requestReset);
router.post('/reset-password', passwordController.resetPassword);

// Authenticated route for changing password
router.post('/:tenant/change', authenticate, checkTenant, passwordController.changePassword);

module.exports = router;
