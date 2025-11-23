const request = require('supertest');
const app = require('../app');
const { setupTestDb } = require('./utils');
const bcrypt = require('bcryptjs');

// Mock the db service
const dbService = require('../src/services/db');
jest.mock('../src/services/db');

let db;
let adminToken;
let employeeToken;
let tenantId = 1;
let employeeId;

beforeAll(async () => {
    db = await setupTestDb();
    dbService.getDb.mockResolvedValue(db);

    // Seed Admin
    const pass = await bcrypt.hash('password123', 10);
    await db.run("INSERT INTO tenants (name) VALUES ('Test Corp')");
    await db.run("INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES (1, 'Admin', 'admin@test.com', 'ADMIN', ?)", [pass]);

    // Login Admin
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = res.body.token;
});

afterAll(async () => {
    await db.close();
});

describe('Integration Flow', () => {
    it('should create an employee', async () => {
        const res = await request(app)
            .post(`/api/${tenantId}/employees`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'John Doe',
                email: 'john@test.com',
                role: 'EMPLOYEE',
                nik: '12345',
                position: 'Dev',
                department: 'IT',
                join_date: '2023-01-01'
            });

        expect(res.statusCode).toEqual(201);
        employeeId = res.body.id;
    });

    it('should login as employee', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'john@test.com', password: 'password123' });

        expect(res.statusCode).toEqual(200);
        employeeToken = res.body.token;
    });

    it('should clock in', async () => {
        const res = await request(app)
            .post(`/api/${tenantId}/attendance/clock-in`)
            .set('Authorization', `Bearer ${employeeToken}`);

        expect(res.statusCode).toEqual(201);
    });

    it('should clock out', async () => {
        const res = await request(app)
            .post(`/api/${tenantId}/attendance/clock-out`)
            .set('Authorization', `Bearer ${employeeToken}`);

        expect(res.statusCode).toEqual(200);
    });

    it('should request leave', async () => {
        const res = await request(app)
            .post(`/api/${tenantId}/leave`)
            .set('Authorization', `Bearer ${employeeToken}`)
            .send({
                type: 'Annual',
                start_date: '2023-12-01',
                end_date: '2023-12-02',
                days: 2,
                reason: 'Vacation'
            });

        expect(res.statusCode).toEqual(201);
    });

    it('should approve leave as admin', async () => {
        // Get leave id first
        const listRes = await request(app)
            .get(`/api/${tenantId}/leave`)
            .set('Authorization', `Bearer ${adminToken}`);

        const leaveId = listRes.body[0].id;

        const res = await request(app)
            .patch(`/api/${tenantId}/leave/${leaveId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('approved');
    });

    it('should create payroll', async () => {
        const res = await request(app)
            .post(`/api/${tenantId}/payroll`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                employee_id: employeeId,
                period_start: '2023-11-01',
                period_end: '2023-11-30',
                base_salary: 5000,
                allowances: { transport: 100 },
                deductions: { tax: 50 }
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.net_salary).toEqual(5050);
    });
});
