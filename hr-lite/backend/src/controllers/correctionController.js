const { getDb } = require('../services/db');
const { createNotification, logApproval } = require('../services/approvalService');

const requestCorrection = async (req, res) => {
    const { date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason } = req.body;
    try {
        const db = await getDb();
        // Get employee ID for the current user
        const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [req.user.id]);
        if (!employee) return res.status(404).json({ error: 'Employee record not found' });

        await db.run(
            `INSERT INTO attendance_corrections 
            (tenant_id, employee_id, date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason, requested_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.tenantId, employee.id, date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason, req.user.id]
        );
        res.status(201).json({ message: 'Correction requested' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to request correction' });
    }
};

const listCorrections = async (req, res) => {
    try {
        const db = await getDb();
        const corrections = await db.all(
            `SELECT ac.*, u.name as employee_name 
             FROM attendance_corrections ac
             JOIN employees e ON ac.employee_id = e.id
             JOIN users u ON e.user_id = u.id
             WHERE ac.tenant_id = ? AND ac.status = 'pending'`,
            [req.tenantId]
        );
        res.json(corrections);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch corrections' });
    }
};

const approveCorrection = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        const correction = await db.get("SELECT * FROM attendance_corrections WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
        if (!correction) return res.status(404).json({ error: 'Correction not found' });

        if (correction.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

        // Update status
        await db.run("UPDATE attendance_corrections SET status = 'approved', approved_by = ? WHERE id = ?", [req.user.id, id]);

        // Update actual attendance (simplified logic: insert or update)
        // In a real app, we'd check if an attendance record exists for that date and update it, or create one.
        // For now, let's assume we just log it.

        await logApproval(req.tenantId, 'ATTENDANCE_CORRECTION', id, 'APPROVE', req.user.id);
        await createNotification(req.tenantId, correction.requested_by, 'CORRECTION_STATUS', 'Your attendance correction was approved');

        res.json({ message: 'Correction approved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve correction' });
    }
};

const rejectCorrection = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        await db.run("UPDATE attendance_corrections SET status = 'rejected', approved_by = ? WHERE id = ?", [req.user.id, id]);

        const correction = await db.get("SELECT requested_by FROM attendance_corrections WHERE id = ?", [id]);
        await logApproval(req.tenantId, 'ATTENDANCE_CORRECTION', id, 'REJECT', req.user.id);
        await createNotification(req.tenantId, correction.requested_by, 'CORRECTION_STATUS', 'Your attendance correction was rejected');

        res.json({ message: 'Correction rejected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reject correction' });
    }
};

module.exports = { requestCorrection, listCorrections, approveCorrection, rejectCorrection };
