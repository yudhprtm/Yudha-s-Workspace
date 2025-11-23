const request = require('supertest');
const app = require('../app');
const { getDb } = require('../src/services/db');
const jwt = require('jsonwebtoken');

describe('RBAC & Approval Workflows', () => {
    let adminToken, hrToken, managerToken, employeeToken;
    let employeeId;
    let tenantId;
    let db;

    beforeAll(async () => {
        db = await getDb();

        // Clean up
        await db.run("DELETE FROM leave_requests");
        await db.run("DELETE FROM attendance_corrections");
        await db.run("DELETE FROM payroll_runs");
        await db.run("DELETE FROM payroll_items");

        // Get Tenant ID
        const tenant = await db.get("SELECT id FROM tenants LIMIT 1");
        tenantId = tenant.id;

        // Setup tokens
        const generateToken = (id, role, tId) => jwt.sign({ id, role, tenantId: tId }, process.env.JWT_SECRET || 'secret');

        // Assuming seeded users: 1=Admin, 2=HR, 3=Manager, 4=Employee
        // We should probably fetch users too to be safe, but let's assume IDs are stable for now or fetch them if needed.
        // Better to fetch users by email to be safe.
        const adminUser = await db.get("SELECT id FROM users WHERE email = 'admin@demo.com'");
        const hrUser = await db.get("SELECT id FROM users WHERE email = 'hr@demo.com'");
        const managerUser = await db.get("SELECT id FROM users WHERE email = 'manager@demo.com'");
        const empUser = await db.get("SELECT id FROM users WHERE email = 'john@demo.com'");

        adminToken = generateToken(adminUser.id, 'ADMIN', tenantId);
        hrToken = generateToken(hrUser.id, 'HR', tenantId);
        managerToken = generateToken(managerUser.id, 'MANAGER', tenantId);
        employeeToken = generateToken(empUser.id, 'EMPLOYEE', tenantId);

        // Get employee ID for user 4
        const emp = await db.get("SELECT id FROM employees WHERE user_id = ?", [empUser.id]);
        employeeId = emp.id;
    });

    describe('Leave Approval', () => {
        let leaveId;

        test('Employee can request leave', async () => {
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
            expect(res.statusCode).toBe(201);

            // Get ID from DB to be sure
            const leave = await db.get("SELECT id FROM leave_requests ORDER BY id DESC LIMIT 1");
            leaveId = leave.id;
        });

        test('Manager can approve leave', async () => {
            // Fetch ID again to be safe
            const leave = await db.get("SELECT id FROM leave_requests ORDER BY id DESC LIMIT 1");
            const idToApprove = leave.id;

            const res = await request(app)
                .patch(`/api/${tenantId}/leave/${idToApprove}/approve`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ comment: 'Approved' });
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('approved');
        });

        test('Employee cannot approve leave', async () => {
            const leave = await db.get("SELECT id FROM leave_requests ORDER BY id DESC LIMIT 1");
            const idToApprove = leave.id;

            const res = await request(app)
                .patch(`/api/${tenantId}/leave/${idToApprove}/approve`)
                .set('Authorization', `Bearer ${employeeToken}`);
            expect(res.statusCode).toBe(403);
        });
    });

    describe('Attendance Correction', () => {
        let correctionId;

        test('Employee can request correction', async () => {
            const res = await request(app)
                .post(`/api/${tenantId}/attendance/corrections`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({
                    date: '2023-11-20',
                    new_clock_in: '2023-11-20T09:00:00',
                    new_clock_out: '2023-11-20T18:00:00',
                    reason: 'Forgot to clock out'
                });
            expect(res.statusCode).toBe(201);

            // Get ID
            const corr = await db.get("SELECT id FROM attendance_corrections ORDER BY id DESC LIMIT 1");
            correctionId = corr.id;
        });

        test('HR can approve correction', async () => {
            const res = await request(app)
                .patch(`/api/${tenantId}/attendance/corrections/${correctionId}/approve`)
                .set('Authorization', `Bearer ${hrToken}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('Payroll Approval', () => {
        let runId;

        test('HR can create draft payroll', async () => {
            const res = await request(app)
                .post(`/api/${tenantId}/payroll/draft`)
                .set('Authorization', `Bearer ${hrToken}`)
                .send({
                    period: '2023-11',
                    employee_ids: [employeeId]
                });
            expect(res.statusCode).toBe(201);
            runId = res.body.id;
        });

        test('HR can submit payroll', async () => {
            const res = await request(app)
                .patch(`/api/${tenantId}/payroll/${runId}/submit`)
                .set('Authorization', `Bearer ${hrToken}`);
            expect(res.statusCode).toBe(200);
        });

        test('Admin can approve payroll', async () => {
            const res = await request(app)
                .patch(`/api/${tenantId}/payroll/${runId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(200);
        });

        test('Manager cannot approve payroll', async () => {
            const res = await request(app)
                .patch(`/api/${tenantId}/payroll/${runId}/approve`)
                .set('Authorization', `Bearer ${managerToken}`);
            expect(res.statusCode).toBe(403);
        });
    });
});
