const request = require('supertest');
const app = require('../app');
const { setupTestDb } = require('./utils');
const bcrypt = require('bcryptjs');

// Mock the db service
const dbService = require('../src/services/db');
jest.mock('../src/services/db');

let db;

beforeAll(async () => {
    db = await setupTestDb();
    dbService.getDb.mockResolvedValue(db);

    // Seed Admin
    const pass = await bcrypt.hash('password123', 10);
    await db.run("INSERT INTO tenants (name) VALUES ('Test Corp')");
    await db.run("INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES (1, 'Admin', 'admin@test.com', 'ADMIN', ?)", [pass]);
});

afterAll(async () => {
    await db.close();
});

describe('Auth API', () => {
    it('should login with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'password123' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('refreshToken');
    });

    it('should fail with invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'wrong' });

        expect(res.statusCode).toEqual(401);
    });
});
