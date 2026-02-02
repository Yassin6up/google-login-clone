const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// Check if we are running in an environment with Postgres (e.g. Vercel)
const isPostgres = !!process.env.POSTGRES_URL;

let db;

if (isPostgres) {
    console.log("Using PostgreSQL Database (Production Mode)");
    db = new Pool({
        connectionString: process.env.POSTGRES_URL + "?sslmode=require",
    });

    // Create table for Postgres
    // Note: Postgres uses 'SERIAL' or 'GENERATED ALWAYS AS IDENTITY' instead of AUTOINCREMENT
    // We adjust the schema creation slightly or rely on the user running this once.
    // For simplicity, we try to create it if not exists.
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            email TEXT,
            password TEXT,
            ip_address TEXT,
            timestamp TEXT
        );
    `;
    db.query(createTableQuery).catch(err => console.error("Error creating table in PG:", err));

} else {
    console.log("Using SQLite Database (Local Mode)");
    const dbPath = path.resolve(__dirname, 'database.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Error opening SQLite DB:', err.message);
        else console.log('Connected to SQLite.');
    });

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            password TEXT,
            ip_address TEXT,
            timestamp TEXT
        )`);
    });
}

/**
 * Unified Database Wrapper
 */
const dbWrapper = {
    // Wrapper for db.run (INSERT, UPDATE, DELETE)
    run: function (sql, params, callback) {
        if (isPostgres) {
            // Convert ? to $1, $2, etc.
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => '$' + (i++));

            db.query(pgSql, params)
                .then(res => {
                    // Mock 'this' context for callback (this.lastID in sqlite)
                    // PG doesn't return lastID easily unless RETURNING id is used or it's implicitly handled.
                    // For this app, we don't strictly use lastID in the logs flow often, but let's be safe.
                    callback.call({ changes: res.rowCount }, null);
                })
                .catch(err => {
                    callback.call(null, err);
                });
        } else {
            db.run(sql, params, callback);
        }
    },

    // Wrapper for db.all (SELECT)
    all: function (sql, params, callback) {
        if (isPostgres) {
            // Convert ? to $1, $2...
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => '$' + (i++));

            db.query(pgSql, params)
                .then(res => {
                    callback(null, res.rows);
                })
                .catch(err => {
                    callback(err, null);
                });
        } else {
            db.all(sql, params, callback);
        }
    }
};

module.exports = dbWrapper;
