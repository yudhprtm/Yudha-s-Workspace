const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const app = require('../app');
const bcrypt = require('bcryptjs');

// Mock DB
jest.mock('../src/services/db', () => {
    let db;
    return {
        getDb: async () => {
            if (db) return db;
            const sqlite3 = require('sqlite3').verbose();
            const { open } = require('sqlite');
            db = await open({
                filename: ':memory:',
                driver: sqlite3.Database
            });
            // Run Migrations
            await db.exec(`
                CREATE TABLE tenants (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
                CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, name TEXT, email TEXT, role TEXT, password_hash TEXT, status TEXT DEFAULT 'active');
                CREATE TABLE employees (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, user_id INTEGER, nik TEXT, position TEXT, department TEXT, join_date DATE);
                CREATE TABLE attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, employee_id INTEGER, clock_in DATETIME, clock_out DATETIME, ip TEXT, note TEXT);
                CREATE TABLE leave_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, employee_id INTEGER, type TEXT, start_date DATE, end_date DATE, days INTEGER, status TEXT DEFAULT 'pending', approver_id INTEGER, reason TEXT);
                CREATE TABLE notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, user_id INTEGER, type TEXT, message TEXT, data_json TEXT);
                CREATE TABLE approvals_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id INTEGER, entity_type TEXT, entity_id INTEGER, action TEXT, performed_by INTEGER, comment TEXT);
            `);
            return db;
        }
    };
});

describe('Business Logic Enhancements', () => {
    let token;
    let tenantId = 1;
    let employeeId;
    let userId;

    beforeAll(async () => {
        // Seed Data
        const db = await require('../src/services/db').getDb();
        await db.run("INSERT INTO tenants (name) VALUES ('Test Tenant')");
        const hash = await bcrypt.hash('password123', 10);
        await db.run("INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)", [1, 'Admin', 'admin@test.com', 'ADMIN', hash]);

        // Login
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'password123' });
        token = res.body.token;

        // Create Employee
        const empRes = await request(app)
            .post('/api/1/employees')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'John Doe',
                email: 'john@test.com',
                role: 'EMPLOYEE',
                nik: '123',
                position: 'Dev',
                department: 'IT',
                join_date: '2023-01-01'
            });
        employeeId = empRes.body.id;
        userId = empRes.body.user_id;

        // Set known password for John
        const db2 = await require('../src/services/db').getDb();
        const hash2 = await bcrypt.hash('password123', 10);
        await db2.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash2, userId]);
    });

    test('Late Calculation: Clock In after 9:00 AM', async () => {
        // Mock Date to 09:30 AM GMT+7 (02:30 UTC)
        const mockDate = new Date('2023-01-01T02:30:00Z');
        jest.useFakeTimers().setSystemTime(mockDate);

        // Login as Employee
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'john@test.com', password: 'password123' });
        const empToken = loginRes.body.token;

        const res = await request(app)
            .post('/api/1/attendance/clock-in')
            .set('Authorization', `Bearer ${empToken}`);

        expect(res.statusCode).toBe(201);
        expect(res.body.note).toBe('Late');
    });

    test('Leave Balance: Reject if > 12 days', async () => {
        const db = await require('../src/services/db').getDb();
        // Insert 12 days of approved leave
        await db.run(`INSERT INTO leave_requests (tenant_id, employee_id, type, start_date, end_date, days, status) 
                      VALUES (1, ?, 'Annual', '2023-01-01', '2023-01-12', 12, 'approved')`, [employeeId]);

        // Login as Employee
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'john@test.com', password: 'password123' });
        const empToken = loginRes.body.token;

        // Request 1 more day
        const reqRes = await request(app)
            .post('/api/1/leave')
            .set('Authorization', `Bearer ${empToken}`)
            .send({
                type: 'Annual',
                start_date: '2023-02-01',
                end_date: '2023-02-01',
                days: 1,
                reason: 'Extra day'
            });

        const leaveId = reqRes.body.id;

        // Approve it (as Admin)
        const approveRes = await request(app)
            .patch(`/api/1/leave/${leaveId}/approve`) // Route is /:id/approve
            .set('Authorization', `Bearer ${token}`) // Admin token
            .send({ status: 'approved' });

        expect(approveRes.statusCode).toBe(400);
        expect(approveRes.body.error).toMatch(/Insufficient leave balance/);
    });

    test('Validation: Create Employee with missing fields', async () => {
        const res = await request(app)
            .post('/api/1/employees')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Incomplete User'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('All fields are required');
    });
});
