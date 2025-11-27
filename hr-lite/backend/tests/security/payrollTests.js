const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

const createToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

const payrollTests = async () => {
    const results = [];

    // Test 1: Employee accessing payroll runs
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });
        const res = await request(app)
            .get('/api/1/payroll/runs')
            .set('Authorization', `Bearer ${employeeToken}`);

        results.push({
            name: 'Employee Cannot Access Payroll Runs',
            pass: res.status === 403,
            expected: '403',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Employee Cannot Access Payroll Runs', pass: false, error: err.message });
    }

    // Test 2: Manager accessing payroll
    try {
        const managerToken = createToken({ id: 2, email: 'mgr@test.com', role: 'MANAGER', tenantId: 1 });
        const res = await request(app)
            .post('/api/1/payroll/draft')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ month: '2025-11' });

        results.push({
            name: 'Manager Cannot Create Payroll',
            pass: res.status === 403,
            expected: '403',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Manager Cannot Create Payroll', pass: false, error: err.message });
    }

    return results;
};

module.exports = payrollTests;
