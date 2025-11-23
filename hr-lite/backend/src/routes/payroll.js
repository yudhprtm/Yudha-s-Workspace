const express = require('express');
const router = express.Router({ mergeParams: true });
const payrollController = require('../controllers/payrollController');
const { authenticate, authorize, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.post('/', authorize(['ADMIN', 'HR']), payrollController.create);
router.get('/:id/payslip', authorize(['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']), payrollController.getPayslip);

module.exports = router;
