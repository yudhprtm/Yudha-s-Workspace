const express = require('express');
const router = express.Router({ mergeParams: true });
const correctionController = require('../controllers/correctionController');
const { authenticate, authorize, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.post('/', authorize(['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']), correctionController.requestCorrection);
router.get('/', authorize(['MANAGER', 'HR', 'ADMIN']), correctionController.listCorrections);
router.patch('/:id/approve', authorize(['MANAGER', 'HR', 'ADMIN']), correctionController.approveCorrection);
router.patch('/:id/reject', authorize(['MANAGER', 'HR', 'ADMIN']), correctionController.rejectCorrection);

module.exports = router;
