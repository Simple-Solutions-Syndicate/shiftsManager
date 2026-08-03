"use strict";

const db = require("./db");
const dayjs = require("dayjs");
const utils = require("./utils");
const crypto = require("crypto");

const keyLength = 64;
const costFactor = 16384;
const blockSize = 8;
const parallelizationFactor = 1;

exports.addUser = (name, role, password, score) => {
  return new Promise((resolve, reject) => {
    var salt = crypto.randomBytes(32);
    crypto.scrypt(
      password,
      salt,
      keyLength,
      { N: costFactor, r: blockSize, p: parallelizationFactor },
      (err, derivedKey) => {
        if (err) throw err;
        password = derivedKey.toString("hex");
        salt = salt.toString("hex");
        const sql =
          "INSERT INTO users (name, role, score, password, salt) VALUES (?, ?, ?, ?, ?)";
        db.run(sql, [name, role, score, password, salt], function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      }
    );
  });
};

exports.editScore = (userId, score) => {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE users SET score = ? WHERE id= ?";
    db.run(sql, [score, userId], function (err) {
      if (err) {
        reject(err);
      }
      resolve(this.lastID);
    });
  });
};

exports.addAbsences = (userId, absences) => {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(absences)) {
      return reject("Errors in params");
    }

    db.serialize(() => {
      db.run(`DELETE FROM absences WHERE user = ?`, [userId], function (err) {
        if (err) {
          reject(err.message);
          return;
        }

        const stmt = db.prepare(
          `INSERT INTO absences (user, date) VALUES (?, ?)`
        );
        absences.forEach((date) => {
          stmt.run(userId, date);
        });
        stmt.finalize();

        resolve("Updated");
      });
    });
  });
};

exports.generateShifts = (month, year) => {
  return new Promise((resolve, reject) => {
    const rulesSql = 'SELECT * FROM shift_rules ORDER BY day_of_week ASC';
    db.all(rulesSql, [], (err, rules) => {
      if (err) {
        reject(err.message);
        return;
      }

      db.all(`SELECT * FROM users`, async (err, users) => {
        if (err) {
          reject(err.message);
          return;
        }

        const usersData = (users || []).map((user) => {
          return new Promise((resolve, reject) => {
            db.all(
              `SELECT date FROM absences WHERE user = ?`,
              [user.id],
              (err, absences) => {
                if (err) reject(err);
                user.absences = (absences || []).map((a) => a.date);
                resolve(user);
              }
            );
          });
        });

        try {
          const usersComplete = await Promise.all(usersData);
          const monthlyShifts = await utils.createMonthlyShifts(
            usersComplete,
            month,
            year,
            rules
          );

          monthlyShifts.forEach((shift) => {
            const shiftSize = shift.shift.length;
            const shiftType = `${shiftSize}_persone`;

            shift.shift.forEach((userName) => {
              const user = usersComplete.find((p) => p.name === userName);
              db.run(
                `INSERT INTO shifts (date, user, shift_type) VALUES (?, ?, ?)`,
                [shift.date, user.id, shiftType]
              );

              db.run(`UPDATE users SET score = ? WHERE id = ?`, [
                user.score,
                user.id,
              ]);
            });
          });

          resolve(monthlyShifts);
        } catch (err) {
          reject(err.message || err);
        }
      });
    });
  });
};

exports.getUser = (name, password) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE name=?";
    db.get(sql, [name], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      } else {
        const user = { id: row.id, name: row.name, role: row.role };

        crypto.scrypt(
          password,
          Buffer.from(row.salt, "hex"),
          keyLength,
          { N: costFactor, r: blockSize, p: parallelizationFactor },
          function (err, hashedPassword) {
            if (err) reject(err);
            if (
              !crypto.timingSafeEqual(
                Buffer.from(row.password, "hex"),
                Buffer.from(hashedPassword, "hex")
              )
            )
              resolve(false);
            else resolve(user);
          }
        );
      }
    });
  });
};

exports.getUsers = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, score, role FROM users ORDER BY name";
    db.all(sql, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

exports.getAbsences = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM absences";
    db.all(sql, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

exports.hasUsers = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT COUNT(*) as count FROM users";
    db.get(sql, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};

exports.deleteUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM absences WHERE user = ?", [userId], function (err) {
      if (err) {
        reject(err);
        return;
      }

      const sql = "DELETE FROM users WHERE id = ?";
      db.run(sql, [userId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  });
};

exports.getShiftRules = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM shift_rules ORDER BY day_of_week ASC';
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

exports.updateShiftRules = (rules) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare("UPDATE shift_rules SET num_people = ? WHERE day_of_week = ?");

      let hasError = false;
      for (const rule of rules) {
        stmt.run(rule.num_people, rule.day_of_week, (err) => {
          if (err) hasError = true;
        });
      }

      stmt.finalize();

      if (hasError) {
        db.run("ROLLBACK", () => reject(new Error("Error updating rules")));
      } else {
        db.run("COMMIT", () => resolve(true));
      }
    });
  });
};

exports.backupScores = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DELETE FROM scores_backup`, (err) => {
        if (err) return reject(err);
        db.run(
          `INSERT INTO scores_backup (user_id, score) SELECT id, score FROM users`,
          function (err) {
            if (err) reject(err);
            else resolve("Scores backed up successfully");
          }
        );
      });
    });
  });
};

exports.restoreScores = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all(`SELECT user_id, score FROM scores_backup`, [], (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) {
          return reject(new Error("No backup found"));
        }

        db.run("BEGIN TRANSACTION", (err) => {
          if (err) return reject(err);
          
          let hasError = false;
          let completed = 0;

          rows.forEach((row) => {
            db.run(
              `UPDATE users SET score = ? WHERE id = ?`,
              [row.score, row.user_id],
              (err) => {
                if (err) hasError = true;
                completed++;
                if (completed === rows.length) {
                  if (hasError) {
                    db.run("ROLLBACK", () => reject(new Error("Error restoring scores")));
                  } else {
                    db.run("COMMIT", () => resolve("Scores restored successfully"));
                  }
                }
              }
            );
          });
        });
      });
    });
  });
};