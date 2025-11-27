const { getDb } = require('../services/db');
const { createNotification, logApproval } = require('../services/approvalService');

const requestLeave = async (req, res, next) => {
    try {
        const { type, start_date, end_date, days, reason } = req.body;

        // Validation
        if (!type || !start_date || !end_date || !days || !reason) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (isNaN(days) || days <= 0) {
            return res.status(400).json({ error: 'Days must be a positive number' });
        }
        if (new Date(start_date) > new Date(end_date)) {
            return res.status(400).json({ error: 'Start date cannot be after end date' });
        }

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

        let newId = result.lastID;
        if (!newId) {
            const row = await db.get("SELECT last_insert_rowid() as id");
            newId = row.id;
        }

        res.status(201).json({ id: newId, status: 'pending' });
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body; // approved, rejected
        const { id } = req.params;
        const approverId = req.user.id;
        const db = await getDb();

        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const leave = await db.get("SELECT * FROM leave_requests WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });

        if (leave.status !== 'pending') {
            return res.status(400).json({ error: 'Leave request is already processed' });
        }

        // Balance Check (only for approval)
        if (status === 'approved') {
            const currentYear = new Date().getFullYear().toString();
            const usedResult = await db.get(
                `SELECT SUM(days) as used FROM leave_requests 
                 WHERE employee_id = ? AND status = 'approved' AND strftime('%Y', start_date) = ?`,
                [leave.employee_id, currentYear]
            );
            const used = usedResult.used || 0;
            const allowance = 12; // Hardcoded annual allowance

            if (used + leave.days > allowance) {
                return res.status(400).json({ error: `Insufficient leave balance. Used: ${used}, Requested: ${leave.days}, Allowance: ${allowance}` });
            }
        }

        await db.run(
            "UPDATE leave_requests SET status = ?, approver_id = ? WHERE id = ? AND tenant_id = ?",
            [status, approverId, id, req.tenantId]
        );

        await logApproval(req.tenantId, 'LEAVE', id, status.toUpperCase(), approverId, req.body.comment);
        await createNotification(req.tenantId, leave.employee_id, 'LEAVE_STATUS', `Your leave request was ${status}`, { leave_id: id });

        res.json({ status });
    } catch (err) {
        next(err);
    }
};

const list = async (req, res, next) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'start_date';
        const sortOrder = req.query.sortOrder || 'DESC';

        let whereClause = "WHERE l.tenant_id = ?";
        let params = [req.tenantId];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [req.user.id]);
            whereClause += " AND l.employee_id = ?";
            params.push(employee.id);
        }

        const countSql = `SELECT COUNT(*) as total 
                          FROM leave_requests l 
                          JOIN employees e ON l.employee_id = e.id 
                          JOIN users u ON e.user_id = u.id 
                          ${whereClause}`;
        const countResult = await db.get(countSql, params);
        const total = countResult.total;

        const sql = `SELECT l.*, e.nik, u.name 
                     FROM leave_requests l 
                     JOIN employees e ON l.employee_id = e.id 
                     JOIN users u ON e.user_id = u.id 
                     ${whereClause}
                     ORDER BY ${sortBy} ${sortOrder}
                     LIMIT ? OFFSET ?`;

        const requests = await db.all(sql, [...params, limit, offset]);

        res.json({
            data: requests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
};

const approve = (req, res, next) => {
    req.body.status = 'approved';
    updateStatus(req, res, next);
};

const reject = (req, res, next) => {
    req.body.status = 'rejected';
    updateStatus(req, res, next);
};

const getBalance = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;

        const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [userId]);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const currentYear = new Date().getFullYear().toString();
        const usedResult = await db.get(
            `SELECT SUM(days) as used FROM leave_requests 
             WHERE employee_id = ? AND status = 'approved' AND strftime('%Y', start_date) = ?`,
            [employee.id, currentYear]
        );
        const used = usedResult.used || 0;
        const allowance = 12;
        const remaining = allowance - used;

        res.json({
            allowance,
            used,
            remaining,
            year: currentYear
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { requestLeave, updateStatus, list, approve, reject, getBalance };
