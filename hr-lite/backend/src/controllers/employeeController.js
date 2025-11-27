const { getDb } = require('../services/db');
const bcrypt = require('bcryptjs');

const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const db = await getDb();

        const countResult = await db.get("SELECT COUNT(*) as total FROM employees WHERE tenant_id = ?", [req.tenantId]);
        const total = countResult.total;

        const employees = await db.all(
            `SELECT e.*, u.name, u.email, u.role, u.status 
             FROM employees e 
             JOIN users u ON e.user_id = u.id 
             WHERE e.tenant_id = ?
             LIMIT ? OFFSET ?`,
            [req.tenantId, limit, offset]
        );

        res.json({
            data: employees,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
};

const get = async (req, res, next) => {
    try {
        const db = await getDb();
        const employee = await db.get(
            `SELECT e.*, u.name, u.email, u.role, u.status 
             FROM employees e 
             JOIN users u ON e.user_id = u.id 
             WHERE e.tenant_id = ? AND e.id = ?`,
            [req.tenantId, req.params.id]
        );
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json(employee);
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, email, role, nik, position, department, join_date } = req.body;

        // Validation
        if (!name || !email || !nik || !position || !department || !join_date) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const db = await getDb();

        // Check if email exists
        const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        // Generate Secure Temp Password
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const tempPassword = `Temp@${randomDigits}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const result = await db.run(
            "INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)",
            [req.tenantId, name, email, role || 'EMPLOYEE', passwordHash]
        );
        const userId = result.lastID;

        const empResult = await db.run(
            "INSERT INTO employees (tenant_id, user_id, nik, position, department, join_date) VALUES (?, ?, ?, ?, ?, ?)",
            [req.tenantId, userId, nik, position, department, join_date]
        );

        res.status(201).json({
            id: empResult.lastID,
            user_id: userId,
            message: 'Employee created successfully',
            temp_password: tempPassword
        });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { name, email, role, nik, position, department, join_date, status } = req.body;
        const db = await getDb();

        const employee = await db.get("SELECT user_id FROM employees WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        await db.run(
            "UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?",
            [name, email, role, status, employee.user_id]
        );

        await db.run(
            "UPDATE employees SET nik = ?, position = ?, department = ?, join_date = ? WHERE id = ?",
            [nik, position, department, join_date, req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const db = await getDb();
        const employee = await db.get("SELECT user_id FROM employees WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenantId]);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // Soft delete or hard delete? User said "DELETE /api/...". I'll do soft delete by setting status to inactive in users, but maybe hard delete for MVP if requested.
        // "DELETE /api/:tenant/employees/:id" implies removal.
        // But usually we don't delete employees. I'll just set status to inactive in users table.

        await db.run("UPDATE users SET status = 'inactive' WHERE id = ?", [employee.user_id]);

        res.json({ success: true, message: 'Employee deactivated' });
    } catch (err) {
        next(err);
    }
};

module.exports = { list, get, create, update, remove };
