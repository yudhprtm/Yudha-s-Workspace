const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

const createToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

const leaveTests = async () => {
    const results = [];

    // Test 1: Leave request exceeding balance
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });
        const res = await request(app)
            .post('/api/1/leave')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({
                type: 'Annual',
                start_date: '2025-12-01',
                end_date: '2025-12-31',
                days: 50, // Exceeds 12-day allowance
                reason: 'Test'
            });

        results.push({
            name: 'Reject Leave Exceeding Balance',
            pass: res.status === 400,
            expected: '400',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Reject Leave Exceeding Balance', pass: false, error: err.message });
    }

    // Test 2: Employee self-approval attempt
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });

        // First create a leave request
        const createRes = await request(app)
            .post('/api/1/leave')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({
                type: 'Annual',
                start_date: '2025-12-01',
                end_date: '2025-12-02',
                days: 2,
                reason: 'Test'
            });

        if (createRes.status === 200 && createRes.body.id) {
            const approveRes = await request(app)
                .patch(`/api/1/leave/${createRes.body.id}/approve`)
                .set('Authorization', `Bearer ${employeeToken}`);

            results.push({
                name: 'Prevent Self-Approval',
                pass: approveRes.status === 403,
                expected: '403',
                actual: approveRes.status
            });
        } else {
            results.push({ name: 'Prevent Self-Approval', pass: false, error: 'Could not create leave request' });
        }
    } catch (err) {
        results.push({ name: 'Prevent Self-Approval', pass: false, error: err.message });
    }

    return results;
};

module.exports = leaveTests;
