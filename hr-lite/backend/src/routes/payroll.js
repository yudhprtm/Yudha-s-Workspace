const express = require('express');
const router = express.Router({ mergeParams: true });
const payrollController = require('../controllers/payrollController');
const { authenticate, authorize, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.post('/draft', authorize(['HR', 'ADMIN']), payrollController.createDraft);
router.get('/runs', authorize(['HR', 'ADMIN']), payrollController.listRuns);
router.patch('/:id/submit', authorize(['HR', 'ADMIN']), payrollController.submit);
router.patch('/:id/approve', authorize(['ADMIN']), payrollController.approve);

// Legacy or other routes
router.post('/', authorize(['HR', 'ADMIN']), payrollController.create);
router.get('/:id', authorize(['EMPLOYEE', 'HR', 'ADMIN']), payrollController.getPayslip);

module.exports = router;
