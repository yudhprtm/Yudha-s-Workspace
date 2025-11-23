const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

async function seed() {
    try {
        console.log('Seeding database...');

        // 1. Create Tenant
        let tenant = await get("SELECT * FROM tenants WHERE name = ?", ['Demo Corp']);
        if (!tenant) {
            await run("INSERT INTO tenants (name, domain) VALUES (?, ?)", ['Demo Corp', 'demo.com']);
            tenant = await get("SELECT * FROM tenants WHERE name = ?", ['Demo Corp']);
            console.log('Tenant created:', tenant.id);
        } else {
            console.log('Tenant already exists:', tenant.id);
        }

        const tenantId = tenant.id;
        const passwordHash = await bcrypt.hash('password123', 10);

        // 2. Create Users & Employees
        const users = [
            { name: 'Admin User', email: 'admin@demo.com', role: 'ADMIN' },
            { name: 'HR Manager', email: 'hr@demo.com', role: 'HR' },
            { name: 'Line Manager', email: 'manager@demo.com', role: 'MANAGER' },
            { name: 'John Doe', email: 'john@demo.com', role: 'EMPLOYEE' },
            { name: 'Jane Smith', email: 'jane@demo.com', role: 'EMPLOYEE' }
        ];

        for (const u of users) {
            let user = await get("SELECT * FROM users WHERE email = ?", [u.email]);
            if (!user) {
                await run(
                    "INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)",
                    [tenantId, u.name, u.email, u.role, passwordHash]
                );
                user = await get("SELECT * FROM users WHERE email = ?", [u.email]);
                console.log(`User created: ${u.email}`);

                // Create Employee record
                await run(
                    "INSERT INTO employees (tenant_id, user_id, nik, position, department, join_date) VALUES (?, ?, ?, ?, ?, ?)",
                    [tenantId, user.id, `NIK-${user.id}`, u.role, 'General', '2023-01-01']
                );
            } else {
                console.log(`User already exists: ${u.email}`);
            }
        }

        // 3. Seed Error
        await run(
            "INSERT INTO errors (tenant_id, route, error_message, stack_trace, payload_json) VALUES (?, ?, ?, ?, ?)",
            [tenantId, '/api/test', 'Simulated Error', 'Error: Simulated Error\n    at seed.js:100', '{"test": true}']
        );
        console.log('Seeded error log');

        console.log('Seeding complete.');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        db.close();
    }
}

seed();
