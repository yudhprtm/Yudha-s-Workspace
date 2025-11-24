const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requestCorrection, listCorrections } = require('./src/controllers/correctionController');

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
    const userId = 1; // Admin/User ID

    console.log(`Using Employee ID: ${employeeId}`);

    // 2. Test requestCorrection
    console.log("\n--- Testing requestCorrection ---");
    const reqPost = {
        tenantId: tenantId,
        user: { id: userId },
        body: {
            date: '2025-01-05',
            old_clock_in: '2025-01-05T09:00:00.000Z',
            old_clock_out: null,
            new_clock_in: '2025-01-05T09:00:00.000Z',
            new_clock_out: '2025-01-05T18:00:00.000Z',
            reason: 'Forgot to clock out (API Test)'
        }
    };
    const resPost = mockRes();

    await requestCorrection(reqPost, resPost);
    console.log("Response:", resPost.statusCode, resPost.data);

    // 3. Test listCorrections
    console.log("\n--- Testing listCorrections ---");
    const reqGet = {
        tenantId: tenantId,
        user: { id: userId, role: 'ADMIN' }
    };
    const resGet = mockRes();

    await listCorrections(reqGet, resGet);
    console.log("Response:", resGet.statusCode, resGet.data);

    if (resGet.data && Array.isArray(resGet.data)) {
        console.log(`Found ${resGet.data.length} corrections.`);
    } else {
        console.error("Failed to list corrections or invalid format.");
    }

    db.close();
}

run().catch(console.error);
