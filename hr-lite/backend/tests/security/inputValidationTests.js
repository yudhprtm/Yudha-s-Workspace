const request = require('supertest');
const app = require('../../app');
const validator = require('../../src/utils/validator');

const inputValidationTests = async () => {
    const results = [];

    // Test 1: SQL Injection detection
    try {
        const sqlInjection = "admin' OR '1'='1";
        const hasSQLInjection = validator.hasSQLInjection(sqlInjection);

        results.push({
            name: 'SQL Injection Detection',
            pass: hasSQLInjection === true,
            expected: 'true',
            actual: hasSQLInjection
        });
    } catch (err) {
        results.push({ name: 'SQL Injection Detection', pass: false, error: err.message });
    }

    // Test 2: XSS detection
    try {
        const xssPayload = '<script>alert("XSS")</script>';
        const hasXSS = validator.hasXSS(xssPayload);

        results.push({
            name: 'XSS Detection',
            pass: hasXSS === true,
            expected: 'true',
            actual: hasXSS
        });
    } catch (err) {
        results.push({ name: 'XSS Detection', pass: false, error: err.message });
    }

    // Test 3: Empty field validation
    try {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: '', password: '' });

        results.push({
            name: 'Empty Field Rejection',
            pass: res.status === 400 || res.status === 401,
            expected: '400/401',
            actual: res.status
        });
    } catch (err) {
        results.push({ name: 'Empty Field Rejection', pass: false, error: err.message });
    }

    // Test 4: Invalid email format
    try {
        const isValid = validator.isValidEmail('not-an-email');

        results.push({
            name: 'Invalid Email Detection',
            pass: isValid === false,
            expected: 'false',
            actual: isValid
        });
    } catch (err) {
        results.push({ name: 'Invalid Email Detection', pass: false, error: err.message });
    }

    return results;
};

module.exports = inputValidationTests;
