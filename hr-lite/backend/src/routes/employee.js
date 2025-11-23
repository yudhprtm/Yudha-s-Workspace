const express = require('express');
const router = express.Router({ mergeParams: true });
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize, checkTenant } = require('../middleware/auth');

router.use(authenticate);
router.use(checkTenant);

router.get('/', authorize(['ADMIN', 'HR', 'MANAGER']), employeeController.list);
router.get('/:id', authorize(['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']), employeeController.get); // Employees can see their own? Logic needed in controller if strict.
router.post('/', authorize(['ADMIN', 'HR']), employeeController.create);
router.patch('/:id', authorize(['ADMIN', 'HR']), employeeController.update);
router.delete('/:id', authorize(['ADMIN', 'HR']), employeeController.remove);

module.exports = router;
