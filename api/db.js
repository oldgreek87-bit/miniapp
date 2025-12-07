const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use /tmp for Vercel serverless (writable directory)
// For production, use PostgreSQL or Supabase instead
const DB_PATH = process.env.DB_PATH || (process.env.VERCEL ? '/tmp/bookflix.db' : path.join(__dirname, '../data/bookflix.db'));

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Create tables
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    subscription_start TEXT,
                    subscription_end TEXT,
                    subscription_status TEXT DEFAULT 'inactive',
                    payment_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS payment_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    payment_id TEXT UNIQUE NOT NULL,
                    amount REAL NOT NULL,
                    days INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT
                )
            `);

            db.run(`
                CREATE INDEX IF NOT EXISTS idx_user_id ON subscriptions(user_id);
            `);

            db.run(`
                CREATE INDEX IF NOT EXISTS idx_payment_id ON payment_history(payment_id);
            `);
        });

        resolve(db);
    });
}

// Get database instance
let dbInstance = null;

async function getDB() {
    if (!dbInstance) {
        dbInstance = await initDB();
    }
    return dbInstance;
}

// Helper functions for database operations
function runQuery(query, params = []) {
    return new Promise(async (resolve, reject) => {
        const db = await getDB();
        db.run(query, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

function getQuery(query, params = []) {
    return new Promise(async (resolve, reject) => {
        const db = await getDB();
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function allQuery(query, params = []) {
    return new Promise(async (resolve, reject) => {
        const db = await getDB();
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    getDB,
    runQuery,
    getQuery,
    allQuery
};

