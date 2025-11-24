const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getMonthly, getRecent } = require('./src/controllers/attendanceController');

const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

// Mock Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function run() {
    // 1. Setup
    const employeeId = await new Promise((resolve, reject) => {
        db.get("SELECT id FROM employees LIMIT 1", (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.id : null);
        });
    });

    if (!employeeId) {
        console.error("No employees found.");
        process.exit(1);
    }

    const tenantId = 'tenant-123';
    const userId = 1;

    // SCENARIO:
    // Insert a record that is in "January" in GMT+7 but "December" in UTC.
    // UTC: 2024-12-31 23:00:00
    // GMT+7: 2025-01-01 06:00:00

    const clockInUTC = '2024-12-31T23:00:00.000Z';
    const clockOutUTC = '2025-01-01T02:00:00.000Z'; // 09:00 Local

    console.log(`Using Employee ID: ${employeeId}`);

    // Clean up
    await new Promise((resolve) => {
        db.run(`DELETE FROM attendance WHERE employee_id = ? AND clock_in = ?`, [employeeId, clockInUTC], () => resolve());
    });

    await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance (tenant_id, employee_id, clock_in, clock_out, ip) VALUES (?, ?, ?, ?, ?)`,
            [tenantId, employeeId, clockInUTC, clockOutUTC, '127.0.0.1'],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
    console.log("Created attendance record at UTC boundary.");

    // 2. Test getMonthly for '2025-01'
    console.log("\n--- Testing getMonthly for 2025-01 ---");
    const reqMonthly = {
        tenantId: tenantId,
        user: { id: userId, role: 'ADMIN' },
        query: { month: '2025-01' }
    };
    const resMonthly = mockRes();

    await getMonthly(reqMonthly, resMonthly);

    const records = resMonthly.data;
    console.log(`Found ${records.length} records.`);
    if (records.length > 0) {
        const rec = records.find(r => r.clock_in === clockInUTC);
        if (rec) {
            console.log("Record found in January report (Correct).");
            console.log("Local Clock In:", rec.clock_in_local);
            if (rec.clock_in_local.startsWith('2025-01-01')) {
                console.log("SUCCESS: Local time is correct.");
            } else {
                console.error("FAILURE: Local time is incorrect:", rec.clock_in_local);
            }
        } else {
            console.error("FAILURE: Record NOT found in January report.");
        }
    } else {
        console.error("FAILURE: No records returned.");
    }

    db.close();
}

run().catch(console.error);
