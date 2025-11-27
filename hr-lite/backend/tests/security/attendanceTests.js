const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const { getDb } = require('../../src/services/db');

const createToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

const attendanceTests = async () => {
    const results = [];

    // Test 1: Direct API manipulation - fake attendance
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        const res = await request(app)
            .post('/api/1/attendance/clock-in')
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({ clock_in: pastDate.toISOString() });

        // Should either reject or use current time, not past time
        results.push({
            name: 'Prevent Past Attendance Manipulation',
            pass: res.status === 400 || res.status === 403 || (res.status === 200 && !res.body.clock_in?.includes(pastDate.toISOString().split('T')[0])),
            expected: 'Reject or use current time',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Prevent Past Attendance Manipulation', pass: false, error: err.message });
    }

    // Test 2: Double clock-in prevention
    try {
        const employeeToken = createToken({ id: 1, email: 'emp@test.com', role: 'EMPLOYEE', tenantId: 1 });

        await request(app)
            .post('/api/1/attendance/clock-in')
            .set('Authorization', `Bearer ${employeeToken}`);

        const res = await request(app)
            .post('/api/1/attendance/clock-in')
            .set('Authorization', `Bearer ${employeeToken}`);

        results.push({
            name: 'Prevent Double Clock-In',
            pass: res.status === 400,
            expected: '400',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Prevent Double Clock-In', pass: false, error: err.message });
    }

    return results;
};

module.exports = attendanceTests;
