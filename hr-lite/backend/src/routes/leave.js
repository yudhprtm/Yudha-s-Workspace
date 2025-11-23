const express = require('express');
const router = express.Router({ mergeParams: true });
const leaveController = require('../controllers/leaveController');
const { authenticate, authorize, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.post('/', leaveController.requestLeave);
router.get('/', leaveController.list);
router.patch('/:id/approve', authorize(['ADMIN', 'HR', 'MANAGER']), (req, res, next) => {
    req.body.status = 'approved';
    leaveController.updateStatus(req, res, next);
});
router.patch('/:id/reject', authorize(['ADMIN', 'HR', 'MANAGER']), (req, res, next) => {
    req.body.status = 'rejected';
    leaveController.updateStatus(req, res, next);
});

module.exports = router;
