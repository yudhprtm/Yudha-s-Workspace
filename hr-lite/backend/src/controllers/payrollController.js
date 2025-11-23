const { getDb } = require('../services/db');

const create = async (req, res, next) => {
    try {
        const { employee_id, period_start, period_end, base_salary, allowances, deductions } = req.body;
        const db = await getDb();

        // Check if employee exists
        const employee = await db.get("SELECT id FROM employees WHERE id = ? AND tenant_id = ?", [employee_id, req.tenantId]);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        // Get configured salary if not provided
        let salaryConfig = await db.get("SELECT * FROM salaries WHERE employee_id = ?", [employee_id]);

        // N10: Missing salary record
        if (!salaryConfig && !base_salary) {
            return res.status(422).json({ error: 'Salary not found for employee' });
        }

        const finalBase = base_salary !== undefined ? base_salary : salaryConfig.base_salary;
        const finalAllowances = allowances || (salaryConfig ? JSON.parse(salaryConfig.allowances_json) : {});
        const finalDeductions = deductions || (salaryConfig ? JSON.parse(salaryConfig.deductions_json) : {});

        // Calculate Net
        let totalAllowances = 0;
        for (const k in finalAllowances) totalAllowances += Number(finalAllowances[k]);

        let totalDeductions = 0;
        for (const k in finalDeductions) totalDeductions += Number(finalDeductions[k]);

        const netSalary = Number(finalBase) + totalAllowances - totalDeductions;

        // N11: Negative salary
        if (netSalary < 0) {
            return res.status(400).json({ error: 'Net salary cannot be negative' });
        }

        const result = await db.run(
            `INSERT INTO payslips 
             (tenant_id, employee_id, period_start, period_end, base_salary, allowances_json, deductions_json, net_salary) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.tenantId, employee_id, period_start, period_end, finalBase, JSON.stringify(finalAllowances), JSON.stringify(finalDeductions), netSalary]
        );

        res.status(201).json({ id: result.lastID, net_salary: netSalary });
    } catch (err) {
        next(err);
    }
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

module.exports = { create, getPayslip };
