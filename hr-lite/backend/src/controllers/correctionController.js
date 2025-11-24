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

        // Update actual attendance
        let existingAttendance;

        // Try to find by exact old_clock_in first (most reliable)
        if (correction.old_clock_in) {
            existingAttendance = await db.get(
                "SELECT * FROM attendance WHERE employee_id = ? AND clock_in = ?",
                [correction.employee_id, correction.old_clock_in]
            );
        }

        // Fallback to date check if not found (e.g. legacy data or missing old_clock_in)
        if (!existingAttendance) {
            existingAttendance = await db.get(
                "SELECT * FROM attendance WHERE employee_id = ? AND date(clock_in) = ?",
                [correction.employee_id, correction.date]
            );
        }

        if (existingAttendance) {
            await db.run(
                "UPDATE attendance SET clock_in = ?, clock_out = ? WHERE id = ?",
                [correction.new_clock_in, correction.new_clock_out, existingAttendance.id]
            );
        } else {
            await db.run(
                "INSERT INTO attendance (tenant_id, employee_id, clock_in, clock_out) VALUES (?, ?, ?, ?)",
                [req.tenantId, correction.employee_id, correction.new_clock_in, correction.new_clock_out]
            );
        }

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
