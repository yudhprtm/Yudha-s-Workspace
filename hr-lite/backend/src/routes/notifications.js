const express = require('express');
const router = express.Router({ mergeParams: true });
const notificationsController = require('../controllers/notificationsController');
const { authenticate, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.get('/', notificationsController.listNotifications);
router.patch('/:id/read', notificationsController.markRead);

module.exports = router;
