const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath);

const migrationsDir = __dirname;

fs.readdir(migrationsDir, (err, files) => {
    if (err) {
        console.error('Could not list migrations:', err);
        process.exit(1);
    }

    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    db.serialize(() => {
        sqlFiles.forEach(file => {
            const migrationPath = path.join(migrationsDir, file);
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            console.log(`Running ${file}...`);
            db.exec(migrationSql, (err) => {
                if (err) {
                    console.error(`Migration ${file} failed:`, err);
                    process.exit(1);
                }
            });
        });
        console.log('All migrations completed');
    });
    db.close();
});
