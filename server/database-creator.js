const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/database.db');

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        score INTEGER DEFAULT 0,
        role TEXT DEFAULT "user",
        password TEXT NOT NULL,
        salt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS absences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user INTEGER,
        date TEXT,
        FOREIGN KEY (user) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        user INTEGER,
        shift_type TEXT,
        FOREIGN KEY (user) REFERENCES users(id)
    )`);
});

db.close();