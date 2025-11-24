const { getDb } = require('../services/db');
const { createNotification, logApproval } = require('../services/approvalService');

const createDraft = async (req, res, next) => {
    try {
        const { period, employee_ids } = req.body; // e.g. "2023-11", [1, 2, 3]
        const db = await getDb();

        // Create Run
        const runResult = await db.run(
            "INSERT INTO payroll_runs (tenant_id, period, created_by) VALUES (?, ?, ?)",
            [req.tenantId, period, req.user.id]
        );
        const runId = runResult.lastID;

        // For each employee, calculate and insert item
        // Simplified: just assuming base salary from salaries table
        for (const empId of employee_ids) {
            const salary = await db.get("SELECT * FROM salaries WHERE employee_id = ?", [empId]);
            if (salary) {
                // Mock calc
                const net = salary.base_salary;
                await db.run(
                    "INSERT INTO payroll_items (payroll_run_id, employee_id, base_salary, net_salary) VALUES (?, ?, ?, ?)",
                    [runId, empId, salary.base_salary, net]
                );
            }
        }

        res.status(201).json({ id: runId, message: 'Payroll draft created' });
    } catch (err) {
        next(err);
    }
};

const submit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run("UPDATE payroll_runs SET status = 'pending' WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
        res.json({ message: 'Payroll submitted for approval' });
    } catch (err) {
        next(err);
    }
};

const approve = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = await getDb();
        await db.run("UPDATE payroll_runs SET status = 'approved', approved_by = ? WHERE id = ? AND tenant_id = ?", [req.user.id, id, req.tenantId]);

        await logApproval(req.tenantId, 'PAYROLL', id, 'APPROVE', req.user.id);

        res.json({ message: 'Payroll approved' });
    } catch (err) {
        next(err);
    }
};

const listRuns = async (req, res, next) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'DESC';

        const countResult = await db.get("SELECT COUNT(*) as total FROM payroll_runs WHERE tenant_id = ?", [req.tenantId]);
        const total = countResult.total;

        const runs = await db.all(
            `SELECT * FROM payroll_runs 
             WHERE tenant_id = ? 
             ORDER BY ${sortBy} ${sortOrder} 
             LIMIT ? OFFSET ?`,
            [req.tenantId, limit, offset]
        );

        res.json({
            data: runs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
};

// Keep old functions for backward compatibility if needed, or replace
const create = async (req, res, next) => {
    // Legacy single payslip creation
    res.status(501).json({ error: 'Use new payroll run flow' });
};

const getPayslip = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = await getDb();

        const payslip = await db.get(
            `SELECT p.*, e.nik, u.name, e.position, e.department
             FROM payslips p
             JOIN employees e ON p.employee_id = e.id
             JOIN users u ON e.user_id = u.id
             WHERE p.id = ? AND p.tenant_id = ?`,
            [id, req.tenantId]
        );

        if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

        // Generate HTML
        const html = `
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Payslip</h1>
                    <p>${payslip.period_start} to ${payslip.period_end}</p>
                </div>
                <div class="info">
                    <div class="row"><strong>Name:</strong> <span>${payslip.name}</span></div>
                    <div class="row"><strong>NIK:</strong> <span>${payslip.nik}</span></div>
                    <div class="row"><strong>Position:</strong> <span>${payslip.position}</span></div>
                </div>
                <div class="section">
                    <div class="row"><strong>Base Salary:</strong> <span>${payslip.base_salary}</span></div>
                    <div class="row"><strong>Allowances:</strong> <span>${payslip.allowances_json}</span></div>
                    <div class="row"><strong>Deductions:</strong> <span>${payslip.deductions_json}</span></div>
                    <div class="row" style="font-size: 1.2em; margin-top: 10px;"><strong>Net Salary:</strong> <span>${payslip.net_salary}</span></div>
                </div>
            </body>
            </html>
        `;

        res.send(html);
    } catch (err) {
        next(err);
    }
};

module.exports = { createDraft, submit, approve, listRuns, create, getPayslip };
