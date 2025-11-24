const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { approveCorrection } = require('./src/controllers/correctionController');

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
        console.error("No employees found. Run seed.js first.");
        process.exit(1);
    }

    const tenantId = 'tenant-123';
    const date = '2025-01-02'; // Use a different date to avoid conflict with previous run
    const clockIn = `${date}T09:00:00.000Z`;
    const oldClockOut = null;
    const newClockOut = `${date}T18:00:00.000Z`;

    console.log(`Using Employee ID: ${employeeId}`);

    // Clean up previous run for this date
    await new Promise((resolve, reject) => {
        db.run(`DELETE FROM attendance WHERE employee_id = ? AND date(clock_in) = ?`, [employeeId, date], (err) => resolve());
    });

    // 2. Create an attendance record with missing clock-out
    await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance (tenant_id, employee_id, clock_in, clock_out, ip) VALUES (?, ?, ?, ?, ?)`,
            [tenantId, employeeId, clockIn, oldClockOut, '127.0.0.1'],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });

    console.log("Created attendance record with missing clock-out.");

    // 3. Create a correction request
    const correctionId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance_corrections 
            (tenant_id, employee_id, date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason, requested_by, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [tenantId, employeeId, date, clockIn, oldClockOut, clockIn, newClockOut, 'Forgot to clock out', 1],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });

    console.log(`Created correction request ID: ${correctionId}`);

    // 4. Call Controller
    const req = {
        params: { id: correctionId },
        tenantId: tenantId,
        user: { id: 1 } // Admin user
    };
    const res = mockRes();

    console.log("Calling approveCorrection controller...");
    await approveCorrection(req, res);

    console.log("Controller Response:", res.statusCode, res.data);

    if (res.statusCode && res.statusCode !== 200) {
        console.error("Controller failed:", res.data);
    }

    // 5. Verify Attendance Record
    const attendance = await new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM attendance WHERE employee_id = ? AND date(clock_in) = ?`,
            [employeeId, date],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });

    console.log("Attendance Record after approval:", attendance);

    if (attendance.clock_out === newClockOut) {
        console.log("SUCCESS: Clock-out was updated.");
    } else {
        console.error("FAILURE: Clock-out was NOT updated.");
    }

    db.close();
}

run().catch(console.error);
