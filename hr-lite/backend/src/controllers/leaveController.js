const { getDb } = require('../services/db');

const requestLeave = async (req, res, next) => {
    try {
        const { type, start_date, end_date, days, reason } = req.body;
        const db = await getDb();
        const userId = req.user.id;

        const employee = await db.get("SELECT id, user_id FROM employees WHERE user_id = ?", [userId]);
        const user = await db.get("SELECT status FROM users WHERE id = ?", [userId]);

        // N9: Terminated employee
        if (user.status !== 'active') return res.status(403).json({ error: 'Account is not active' });

        // N8: Overlapping leave
        const overlap = await db.get(
            `SELECT id FROM leave_requests 
             WHERE employee_id = ? 
             AND status = 'approved'
             AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`,
            [employee.id, end_date, start_date, end_date, start_date]
        );

        if (overlap) return res.status(409).json({ error: 'Leave overlaps with existing approved leave' });

        const result = await db.run(
            "INSERT INTO leave_requests (tenant_id, employee_id, type, start_date, end_date, days, reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [req.tenantId, employee.id, type, start_date, end_date, days, reason]
        );

        res.status(201).json({ id: result.lastID, status: 'pending' });
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body; // approved, rejected
        const { id } = req.params;
        const approverId = req.user.id;

        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const db = await getDb();
        await db.run(
            "UPDATE leave_requests SET status = ?, approver_id = ? WHERE id = ? AND tenant_id = ?",
            [status, approverId, id, req.tenantId]
        );

        res.json({ status });
    } catch (err) {
        next(err);
    }
};

const list = async (req, res, next) => {
    try {
        const db = await getDb();
        let sql = `SELECT l.*, e.nik, u.name 
                   FROM leave_requests l 
                   JOIN employees e ON l.employee_id = e.id 
                   JOIN users u ON e.user_id = u.id 
                   WHERE l.tenant_id = ?`;
        const params = [req.tenantId];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [req.user.id]);
            sql += " AND l.employee_id = ?";
            params.push(employee.id);
        }

        const requests = await db.all(sql, params);
        res.json(requests);
    } catch (err) {
        next(err);
    }
};

module.exports = { requestLeave, updateStatus, list };
