const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

const createToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

const roleTests = async () => {
    const results = [];

    // Test 1: Employee accessing HR endpoint
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });
        const res = await request(app)
            .post('/api/1/employees')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({ name: 'Test', email: 'test@test.com', role: 'EMPLOYEE' });

        results.push({
            name: 'Employee Cannot Create Employee',
            pass: res.status === 403,
            expected: '403',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Employee Cannot Create Employee', pass: false, error: err.message });
    }

    // Test 2: Manager accessing admin endpoint
    try {
        const managerToken = createToken({ id: 2, email: 'mgr@test.com', role: 'MANAGER', tenantId: 1 });
        const res = await request(app)
            .get('/api/1/payroll/runs')
            .set('Authorization', `Bearer ${managerToken}`);

        results.push({
            name: 'Manager Cannot Access Payroll',
            pass: res.status === 403,
            expected: '403',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Manager Cannot Access Payroll', pass: false, error: err.message });
    }

    // Test 3: Invalid role
    try {
        const invalidToken = createToken({ id: 3, email: 'invalid@test.com', role: 'HACKER', tenantId: 1 });
        const res = await request(app)
            .get('/api/1/employees')
            .set('Authorization', `Bearer ${invalidToken}`);

        results.push({
            name: 'Invalid Role Rejection',
            pass: res.status === 403 || res.status === 401,
            expected: '403/401',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Invalid Role Rejection', pass: false, error: err.message });
    }

    return results;
};

module.exports = roleTests;
