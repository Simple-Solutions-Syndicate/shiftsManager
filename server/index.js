"use strict";
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const RateLimit = require("express-rate-limit");
const fs = require("fs");
const https = require("https");

const dao = require("./dao");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const app = new express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: [process.env.ORIGIN1, process.env.ORIGIN2] || "http://localhost:5173",
  credentials: true,
};

const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 20,
});

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(compression());
app.use(helmet());

passport.use(
  new LocalStrategy(async function verify(username, password, callback) {
    const user = await dao.getUser(username, password);
    if (!user) return callback(null, false, "Wrong username or password");

    return callback(null, user);
  })
);

passport.serializeUser(function (user, callback) {
  callback(null, user);
});

passport.deserializeUser(function (user, callback) {
  return callback(null, user);
});

const session = require("express-session");
const MemoryStore = require("memorystore")(session);

app.use(
  session({
    secret: process.env.SESSION_KEY || "fallback_secret_key", 
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
    },
    store: new MemoryStore({
      checkPeriod: 86400000, 
    }),
  })
);

app.use(passport.authenticate("session"));

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
};

function generateMarkdownTable(jsonData) {
  let markdown = "| Data       | Turno Persone |\n";
  markdown += "|------------|---------------|\n";

  if (!jsonData || !Array.isArray(jsonData)) {
    return markdown;
  }

  jsonData.forEach((item) => {
    if (!item) return;
    const date = item.date || ""; 
    const shift = Array.isArray(item.shift) ? item.shift : []; 
    
    let row = `| ${date} `;
    shift.forEach(userName => {
      row += `| ${userName} `;
    });
    row += "|\n";
    
    markdown += row;
  });

  return markdown;
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.get("/api/setup/status", (req, res) => {
  dao.hasUsers()
    .then((initialized) => res.status(200).json({ initialized }))
    .catch((err) => res.status(500).json(err));
});

app.post("/api/setup/admin", (req, res) => {
  dao.hasUsers()
    .then((isInitialized) => {
      if (isInitialized) {
        return res.status(403).json({ error: "Il sistema è già stato inizializzato." });
      }

      const { name, password } = req.body;
      dao.addUser(name, "admin", password, 0)
        .then((response) => res.status(200).json({ id: response, message: "Admin creato con successo" }))
        .catch((err) => res.status(500).json(err));
    })
    .catch((err) => res.status(500).json(err));
});

app.post("/api/user", [isLoggedIn], (req, res) => {
  const { name, role, password, score } = req.body;
  dao
    .addUser(name, role || "user", password, score || 0)
    .then((response) => res.status(200).json({ id: response, message: "Utente aggiunto con successo" }))
    .catch((err) => res.status(500).json({ error: err.message || err }));
});

app.post("/api/users", [isLoggedIn], (req, res) => {
  const { name, role, password, score } = req.body;
  dao
    .addUser(name, role || "user", password, score || 0)
    .then((response) => res.status(200).json({ id: response, message: "Utente aggiunto con successo" }))
    .catch((err) => res.status(500).json({ error: err.message || err }));
});

app.delete("/api/user/:id", [isLoggedIn], (req, res) => {
  const userId = req.params.id;
  dao.deleteUser(userId)
    .then((changes) => {
      if (changes === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      res.status(200).json({ message: "Utente eliminato con successo" });
    })
    .catch((err) => res.status(500).json(err));
});

app.post("/api/absences", (req, res) => {
  const { userId, absences } = req.body;
  dao
    .addAbsences(userId, absences)
    .then((response) => res.status(200).json(response))
    .catch((err) => res.status(500).json(err));
});

app.get("/api/absences", (req, res) => {
  dao
    .getAbsences()
    .then((response) => res.status(200).json(response))
    .catch((err) => res.status(500).json(err));
});

app.patch("/api/score", [isLoggedIn], (req, res) => {
  const { userId, score } = req.body;
  dao
    .editScore(userId, score)
    .then((response) => res.status(200).json({ id: response, message: "Punteggio modificato con successo" }))
    .catch((err) => res.status(500).json(err));
});

app.get("/api/shifts", [isLoggedIn], async (req, res) => {
  const { month, year } = req.query;
  try {
    const response = await dao.generateShifts(month, year);
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="generated.md"'
    );
    res.setHeader("Content-Type", "text/markdown");
    res.status(200);
    const markdown = generateMarkdownTable(response);
    res.send(markdown);
  } catch (err) {
    console.error("ERRORE CRITICO NELLA DAO SHIFTS:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get("/api/users", (req, res) => {
  dao
    .getUsers()
    .then((response) => res.status(200).json(response))
    .catch((err) => res.status(500).json(err));
});

app.post("/api/sessions", function (req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      return res.status(200).json(req.user);
    });
  })(req, res, next);
});

app.get("/api/sessions/current", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(req.user);
  } else res.status(401).json({ error: "Not authenticated" });
});

app.delete("/api/sessions/current", (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});

app.get("/api/rules", (req, res) => {
  dao.getShiftRules()
    .then((rules) => res.status(200).json(rules))
    .catch((err) => res.status(500).json(err));
});

app.put("/api/rules", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  
  try {
    const rules = req.body.rules; 
    await dao.updateShiftRules(rules);
    res.status(200).json({ message: "Rules updated successfully" });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/api/scores/backup", [isLoggedIn], async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  try {
    await dao.backupScores();
    res.status(200).json({ message: "Backup dei punteggi eseguito con successo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/scores/restore", [isLoggedIn], async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  try {
    await dao.restoreScores();
    res.status(200).json({ message: "Ripristino dei punteggi completato con successo" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.MODE === "production") {
  https
    .createServer(
      {
        key: fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERTIFICATE),
      },
      app
    )
    .listen(port, function () {
      console.log("Server running on port ", port);
    });
} else {
  app.listen(port, () => {
    console.log("Server listening on port ", port);
  });
}

module.exports = app;