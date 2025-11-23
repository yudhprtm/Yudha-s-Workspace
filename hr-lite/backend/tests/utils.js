const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const setupTestDb = async () => {
    const db = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });

    // Run migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.exec(sql);
    }

    return db;
};

module.exports = { setupTestDb };
