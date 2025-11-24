const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getRecent } = require('./src/controllers/attendanceController');

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
    const userId = 1; // Admin

    console.log(`Using Employee ID: ${employeeId}`);

    // Insert dummy record
    await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance (tenant_id, employee_id, clock_in, ip) VALUES (?, ?, ?, ?)`,
            [tenantId, employeeId, new Date().toISOString(), '127.0.0.1'],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
    console.log("Inserted dummy record.");

    // 2. Test getRecent
    console.log("\n--- Testing getRecent ---");
    const req = {
        tenantId: tenantId,
        user: { id: userId, role: 'ADMIN' }
    };
    const res = mockRes();

    await getRecent(req, res);

    const records = res.data;
    if (records && records.length > 0) {
        const firstRecord = records[0];
        console.log("First Record:", firstRecord);
        if (firstRecord.name) {
            console.log(`SUCCESS: Found name: "${firstRecord.name}"`);
        } else {
            console.error("FAILURE: name is missing.");
        }
        if (firstRecord.employee_name) {
            console.error("FAILURE: employee_name should NOT be present.");
        }
    } else {
        console.log("No records found to verify.");
    }

    db.close();
}

run().catch(console.error);
