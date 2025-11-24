const { getDb } = require('../services/db');

const clockIn = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;

        // Get employee ID
        const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [userId]);
        if (!employee) {
            console.error(`Employee profile not found for user ${userId}`);
            return res.status(404).json({ error: 'Employee profile not found. Please contact HR.' });
        }

        // Check if already clocked in today without clock out
        const today = new Date().toISOString().split('T')[0];
        const existing = await db.get(
            `SELECT * FROM attendance 
             WHERE employee_id = ? AND date(clock_in) = ? AND clock_out IS NULL`,
            [employee.id, today]
        );

        if (existing) {
            // N7: Clock-in twice without clock-out -> create second clock-in but flag as "missing clock-out" in meta
            // For MVP, I'll just return an error or maybe close the previous one?
            // User requirement: "create second clock-in but flag as 'missing clock-out' in meta; admin can correct."

            // I'll update the previous one's note to "Missing Clock Out" and create a new one.
            await db.run("UPDATE attendance SET note = ? WHERE id = ?", ['Missing Clock Out', existing.id]);
        }

        const now = new Date().toISOString();
        const ip = req.ip;

        const result = await db.run(
            "INSERT INTO attendance (tenant_id, employee_id, clock_in, ip) VALUES (?, ?, ?, ?)",
            [req.tenantId, employee.id, now, ip]
        );

        res.status(201).json({ attendance_id: result.lastID, clock_in: now });
    } catch (err) {
        next(err);
    }
};

const clockOut = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [userId]);

        // Find latest open clock-in
        const entry = await db.get(
            `SELECT * FROM attendance 
             WHERE employee_id = ? AND clock_out IS NULL 
             ORDER BY clock_in DESC LIMIT 1`,
            [employee.id]
        );

        if (!entry) {
            return res.status(400).json({ error: 'No active clock-in found' });
        }

        const now = new Date().toISOString();
        await db.run("UPDATE attendance SET clock_out = ? WHERE id = ?", [now, entry.id]);

        res.json({ attendance_id: entry.id, clock_out: now });
    } catch (err) {
        next(err);
    }
};

const getMonthly = async (req, res, next) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ error: 'Month required (YYYY-MM)' });

        const db = await getDb();
        // If admin/hr/manager, can see all. Employee sees only theirs.
        // Fix: Filter by local time (GMT+7) and return local time columns
        let sql = `SELECT a.*, e.nik, u.name,
                   datetime(a.clock_in, '+7 hours') as clock_in_local,
                   datetime(a.clock_out, '+7 hours') as clock_out_local
                   FROM attendance a 
                   JOIN employees e ON a.employee_id = e.id 
                   JOIN users u ON e.user_id = u.id 
                   WHERE a.tenant_id = ? AND strftime('%Y-%m', datetime(a.clock_in, '+7 hours')) = ?`;
        const params = [req.tenantId, month];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [req.user.id]);
            sql += " AND a.employee_id = ?";
            params.push(employee.id);
        }

        const records = await db.all(sql, params);
        res.json(records);
    } catch (err) {
        next(err);
    }
};

const getRecent = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;

        // Default to current month (Local Time GMT+7)
        // We can't easily get "local time" in Node without a library or manual offset, 
        // but for query purposes we can just use the server time if it's close, 
        // OR better: let's just ask for the last 30 days or similar? 
        // The requirement says "Default to current month".
        // Let's manually adjust to GMT+7 for the "current month" string.
        const now = new Date();
        const localNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const month = localNow.toISOString().slice(0, 7); // YYYY-MM

        let sql = `SELECT a.*, e.nik, u.name,
                   datetime(a.clock_in, '+7 hours') as clock_in_local,
                   datetime(a.clock_out, '+7 hours') as clock_out_local
                   FROM attendance a 
                   JOIN employees e ON a.employee_id = e.id 
                   JOIN users u ON e.user_id = u.id 
                   WHERE a.tenant_id = ? AND strftime('%Y-%m', datetime(a.clock_in, '+7 hours')) = ?`;
        const params = [req.tenantId, month];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [userId]);
            if (!employee) return res.json([]); // Return empty if no profile
            sql += " AND a.employee_id = ?";
            params.push(employee.id);
        }

        sql += " ORDER BY a.clock_in DESC";

        const records = await db.all(sql, params);
        res.json(records);
    } catch (err) {
        next(err);
    }
};

module.exports = { clockIn, clockOut, getMonthly, getRecent };
