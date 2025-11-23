const express = require('express');
const router = express.Router({ mergeParams: true });
const attendanceController = require('../controllers/attendanceController');
const { authenticate, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.get('/monthly', attendanceController.getMonthly);
router.get('/', attendanceController.getRecent);

module.exports = router;
