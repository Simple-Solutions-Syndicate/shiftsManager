'use strict';

const sqlite = require('sqlite3').verbose();

const db = new sqlite.Database('./data/database.db', (err) => {
  if (err) {
    console.error(err);
    throw err;
  }
});

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

  db.run(`CREATE TABLE IF NOT EXISTS shift_rules (
        day_of_week INTEGER PRIMARY KEY, 
        num_people INTEGER DEFAULT 0
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS scores_backup (
  user_id INTEGER PRIMARY KEY,
  score INTEGER
)`);

  db.get("SELECT COUNT(*) AS count FROM shift_rules", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO shift_rules (day_of_week, num_people) VALUES (?, ?)");
      for (let i = 0; i < 7; i++) {
        const defaultPeople = (i >= 1 && i <= 5) ? 3 : 0;
        stmt.run(i, defaultPeople);
      }
      stmt.finalize();
      console.log("Tabella shift_rules popolata.");
    }
  });

  console.log("Database pronto.");
});

module.exports = db;