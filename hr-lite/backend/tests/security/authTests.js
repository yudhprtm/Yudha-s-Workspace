const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

const authTests = async () => {
    const results = [];

    // Test 1: Wrong credentials
    try {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@test.com', password: 'wrongpass' });

        results.push({
            name: 'Wrong Credentials Rejection',
            pass: res.status === 401 || res.status === 404,
            expected: '401/404',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Wrong Credentials Rejection', pass: false, error: err.message });
    }

    // Test 2: JWT Tampering
    try {
        const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTk5LCJlbWFpbCI6ImhhY2tlckB0ZXN0LmNvbSIsInJvbGUiOiJBRE1JTiIsInRlbmFudElkIjoxfQ.fake_signature';

        const res = await request(app)
            .get('/api/1/employees')
            .set('Authorization', `Bearer ${tamperedToken}`);

        results.push({
            name: 'JWT Tampering Rejection',
            pass: res.status === 401 || res.status === 403,
            expected: '401/403',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'JWT Tampering Rejection', pass: false, error: err.message });
    }

    // Test 3: Missing Token
    try {
        const res = await request(app).get('/api/1/employees');

        results.push({
            name: 'Missing Token Rejection',
            pass: res.status === 401,
            expected: '401',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Missing Token Rejection', pass: false, error: err.message });
    }

    return results;
};

module.exports = authTests;
