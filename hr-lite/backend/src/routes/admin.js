const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Admin routes might not be tenant-scoped in the URL, but restricted to ADMIN role.
// Or maybe Super Admin? For this MVP, any ADMIN of any tenant can see errors?
// The requirements say "/admin/errors" and "/admin/export-debug.zip".
// It implies a system-wide admin or tenant admin.
// "Admin Error Dashboard listing errors... user, tenant..." implies system admin.
// I'll restrict to ADMIN role.

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/errors', adminController.listErrors);
router.get('/export-debug.zip', adminController.exportDebug);

module.exports = router;
