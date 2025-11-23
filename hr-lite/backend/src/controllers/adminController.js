const { getDb } = require('../services/db');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const listErrors = async (req, res, next) => {
    try {
        const db = await getDb();
        const errors = await db.all("SELECT * FROM errors ORDER BY created_at DESC LIMIT 100");
        res.json(errors);
    } catch (err) {
        next(err);
    }
};

const exportDebug = async (req, res, next) => {
    try {
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment('debug-export.zip');
        archive.pipe(res);

        // Add DB
        const dbPath = path.resolve(__dirname, '../../db.sqlite');
        if (fs.existsSync(dbPath)) {
            archive.file(dbPath, { name: 'db.sqlite' });
        }

        // Add Logs
        const logDir = path.resolve(__dirname, '../../logs');
        if (fs.existsSync(logDir)) {
            archive.directory(logDir, 'logs');
        }

        await archive.finalize();
    } catch (err) {
        next(err);
    }
};

module.exports = { listErrors, exportDebug };
