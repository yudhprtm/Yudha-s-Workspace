const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function getDb() {
    if (db) return db;

    db = await open({
        filename: process.env.DB_PATH || path.resolve(__dirname, '../../db.sqlite'),
        driver: sqlite3.Database
    });

    return db;
}

module.exports = {
    getDb
};
