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
        console.error("No employees found.");
        process.exit(1);
    }

    const tenantId = 'tenant-123';

    // SCENARIO:
    // User is in UTC+7.
    // Clock In: 2025-01-03 06:00:00 Local Time
    // UTC: 2025-01-02 23:00:00 UTC
    // Date(UTC): 2025-01-02
    // Correction Date (Local): 2025-01-03

    const localDate = '2025-01-03';
    const clockInUTC = '2025-01-02T23:00:00.000Z'; // Previous day in UTC
    const oldClockOut = null;
    const newClockOutUTC = '2025-01-03T10:00:00.000Z'; // 17:00 Local

    console.log(`Using Employee ID: ${employeeId}`);
    console.log(`Clock In (UTC): ${clockInUTC}`);
    console.log(`Correction Date (Local): ${localDate}`);

    // Clean up
    await new Promise((resolve) => {
        db.run(`DELETE FROM attendance WHERE employee_id = ?`, [employeeId], () => resolve());
    });

    // 2. Create attendance record (UTC date is 2025-01-02)
    const attendanceId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance (tenant_id, employee_id, clock_in, clock_out, ip) VALUES (?, ?, ?, ?, ?)`,
            [tenantId, employeeId, clockInUTC, oldClockOut, '127.0.0.1'],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
    console.log(`Created attendance record ID: ${attendanceId}`);

    // 3. Create correction request (Date is 2025-01-03)
    const correctionId = await new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO attendance_corrections 
            (tenant_id, employee_id, date, old_clock_in, old_clock_out, new_clock_in, new_clock_out, reason, requested_by, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [tenantId, employeeId, localDate, clockInUTC, oldClockOut, clockInUTC, newClockOutUTC, 'Forgot to clock out', 1],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
    console.log(`Created correction request ID: ${correctionId}`);

    // 4. Approve
    const req = {
        params: { id: correctionId },
        tenantId: tenantId,
        user: { id: 1 }
    };
    const res = mockRes();

    await approveCorrection(req, res);
    console.log("Controller Response:", res.statusCode, res.data);

    // 5. Verify
    // We expect the EXISTING record (ID: attendanceId) to be updated.
    // We do NOT expect a NEW record.

    const records = await new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM attendance WHERE employee_id = ?`,
            [employeeId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });

    console.log("Attendance Records:", records);

    if (records.length > 1) {
        console.error("FAILURE: Duplicate record created!");
    } else if (records.length === 1) {
        if (records[0].id === attendanceId && records[0].clock_out === newClockOutUTC) {
            console.log("SUCCESS: Correct record updated.");
        } else {
            console.error("FAILURE: Record not updated correctly.");
        }
    } else {
        console.error("FAILURE: No records found?");
    }

    db.close();
}

run().catch(console.error);
