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
            await db.run("UPDATE attendance SET note = ? WHERE id = ?", ['Missing Clock Out', existing.id]);
        }

        const now = new Date();
        const utcNow = now.toISOString();
        const ip = req.ip;

        // Calculate Late (GMT+7)
        // 9:00 AM GMT+7 = 02:00 UTC
        // We use a simple check: if hour (adjusted to GMT+7) > 9, or hour=9 and min>0
        const localTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const localHour = localTime.getUTCHours();
        const localMin = localTime.getUTCMinutes();

        let note = '';
        if (localHour > 9 || (localHour === 9 && localMin > 0)) {
            note = 'Late';
        }

        const result = await db.run(
            "INSERT INTO attendance (tenant_id, employee_id, clock_in, ip, note) VALUES (?, ?, ?, ?, ?)",
            [req.tenantId, employee.id, utcNow, ip, note]
        );

        res.status(201).json({ attendance_id: result.lastID, clock_in: utcNow, note });
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

        const now = new Date();
        const utcNow = now.toISOString();

        // Calculate Overtime (GMT+7)
        // 17:00 GMT+7 = 10:00 UTC
        const localTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const localHour = localTime.getUTCHours();

        let note = entry.note || '';
        if (localHour >= 17) {
            // Simple OT calculation: hours after 17:00
            // If clocked out at 18:30, OT is 1.5 hours? 
            // Prompt says "Calculate simple overtime". I'll just mark it.
            // "Overtime"
            const otHours = localHour - 17;
            const otSuffix = `Overtime: ${otHours}h`;
            note = note ? `${note}, ${otSuffix}` : otSuffix;
        }

        await db.run("UPDATE attendance SET clock_out = ?, note = ? WHERE id = ?", [utcNow, note, entry.id]);

        res.json({ attendance_id: entry.id, clock_out: utcNow, note });
    } catch (err) {
        next(err);
    }
};

const getMonthly = async (req, res, next) => {
    try {
        const { month, page = 1, limit = 10, sortBy = 'clock_in', sortOrder = 'DESC' } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ error: 'Month required (YYYY-MM)' });

        const offset = (page - 1) * limit;
        const db = await getDb();

        // Base query
        let baseSql = `FROM attendance a 
                       JOIN employees e ON a.employee_id = e.id 
                       JOIN users u ON e.user_id = u.id 
                       WHERE a.tenant_id = ? AND strftime('%Y-%m', datetime(a.clock_in, '+7 hours')) = ?`;
        const params = [req.tenantId, month];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [req.user.id]);
            baseSql += " AND a.employee_id = ?";
            params.push(employee.id);
        }

        // Count total
        const countResult = await db.get(`SELECT COUNT(*) as total ${baseSql}`, params);
        const total = countResult.total;

        // Fetch paginated data
        const sql = `SELECT a.*, e.nik, u.name,
                   datetime(a.clock_in, '+7 hours') as clock_in_local,
                   datetime(a.clock_out, '+7 hours') as clock_out_local
                   ${baseSql}
                   ORDER BY ${sortBy} ${sortOrder}
                   LIMIT ? OFFSET ?`;

        const records = await db.all(sql, [...params, limit, offset]);

        res.json({
            data: records,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
};

const getRecent = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, sortBy = 'clock_in', sortOrder = 'DESC' } = req.query;
        const offset = (page - 1) * limit;
        const db = await getDb();
        const userId = req.user.id;

        const now = new Date();
        const localNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const month = localNow.toISOString().slice(0, 7); // YYYY-MM

        let baseSql = `FROM attendance a 
                       JOIN employees e ON a.employee_id = e.id 
                       JOIN users u ON e.user_id = u.id 
                       WHERE a.tenant_id = ? AND strftime('%Y-%m', datetime(a.clock_in, '+7 hours')) = ?`;
        const params = [req.tenantId, month];

        if (req.user.role === 'EMPLOYEE') {
            const employee = await db.get("SELECT id FROM employees WHERE user_id = ?", [userId]);
            if (!employee) return res.json({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
            baseSql += " AND a.employee_id = ?";
            params.push(employee.id);
        }

        // Count total
        const countResult = await db.get(`SELECT COUNT(*) as total ${baseSql}`, params);
        const total = countResult.total;

        // Fetch data
        const sql = `SELECT a.*, e.nik, u.name,
                   datetime(a.clock_in, '+7 hours') as clock_in_local,
                   datetime(a.clock_out, '+7 hours') as clock_out_local
                   ${baseSql}
                   ORDER BY ${sortBy} ${sortOrder}
                   LIMIT ? OFFSET ?`;

        const records = await db.all(sql, [...params, limit, offset]);

        res.json({
            data: records,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { clockIn, clockOut, getMonthly, getRecent };
