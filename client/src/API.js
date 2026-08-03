"use strict";

const SERVER_URL = import.meta.env.VITE_API_SERVER_URL;

function getUsers() {
  return fetch(SERVER_URL + "users")
    .then((users) => {
      return users.json();
    })
    .catch((error) => {
      throw error;
    });
}

function getAbsences() {
  return fetch(SERVER_URL + "absences")
    .then((absences) => {
      return absences.json();
    })
    .catch((error) => {
      throw error;
    });
}

function insertAbsences(id, absences) {
  return fetch(SERVER_URL + "absences/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ absences: absences, userId: id }),
    credentials: "include",
  }).then((res) => {
    if (res.ok) {
      return res.json();
    } else {
      return res.json().then((err) => {
        throw err;
      });
    }
  });
}

function generateShifts(month, year) {
  return fetch(SERVER_URL + "shifts/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ month: month, year: year }),
    credentials: "include",
  }).then((res) => {
    if (res.ok) {
      return res;
    } else {
      return res.json().then((err) => {
        throw err;
      });
    }
  });
}

function login(username, password) {
  return fetch(SERVER_URL + "sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  })
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        return res.json().then((err) => {
          throw err;
        });
      }
    })
    .then((user) => {
      return user;
    })
    .catch((error) => {
      throw error;
    });
}

function logout() {
  return fetch(SERVER_URL + "sessions/current", {
    method: "DELETE",
    credentials: "include",
  })
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        return res.json().then((err) => {
          throw err;
        });
      }
    })
    .then(() => {
      return null;
    })
    .catch((error) => {
      throw error;
    });
}

function getInfo() {
  return fetch(SERVER_URL + "sessions/current", {
    method: "GET",
    credentials: "include",
  })
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        return res.json().then((err) => {
          throw err;
        });
      }
    })
    .then((user) => {
      return user;
    })
    .catch((error) => {
      throw error;
    });
}

function getSetupStatus() {
  return fetch(SERVER_URL + "setup/status")
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        return res.json().then((err) => {
          throw err;
        });
      }
    })
    .catch((error) => {
      throw error;
    });
}

function setupAdmin(name, password) {
  return fetch(SERVER_URL + "setup/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: name, password: password }),
  }).then((res) => {
    if (res.ok) {
      return res.json();
    } else {
      return res.json().then((err) => {
        throw err;
      });
    }
  });
}

async function getShiftRules() {
  const response = await fetch(`${SERVER_URL}rules`, { credentials: "include" });
  if (response.ok) {
    return await response.json();
  } else {
    throw await response.json();
  }
}

async function updateShiftRules(rules) {
  const response = await fetch(`${SERVER_URL}rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules }),
    credentials: "include",
  });
  if (!response.ok) {
    throw await response.json();
  }
}

async function addUser(name, role, password, score) {
  const response = await fetch(`${SERVER_URL}users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, password, score }),
    credentials: "include",
  });
  if (!response.ok) {
    throw await response.json();
  }
  return await response.json();
}

async function patchScore(userId, score) {
  const response = await fetch(`${SERVER_URL}score`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, score }),
    credentials: "include",
  });
  if (!response.ok) {
    throw await response.json();
  }
  return await response.json();
}

async function deleteUser(userId) {
  const response = await fetch(`${SERVER_URL}user/${userId}`, {
    method: 'DELETE',
    credentials: "include",
  });
  if (!response.ok) {
    throw await response.json();
  }
  return await response.json();
}

const backupScores = async () => {
  const response = await fetch(`${SERVER_URL}scores/backup`, {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();
  if (response.ok) {
    return data;
  } else {
    throw data;
  }
};

const restoreScores = async () => {
  const response = await fetch(`${SERVER_URL}scores/restore`, {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();
  if (response.ok) {
    return data;
  } else {
    throw data;
  }
};

const API = {
  getUsers,
  insertAbsences,
  generateShifts,
  login,
  logout,
  getInfo,
  patchScore,
  addUser,
  getAbsences,
  getSetupStatus,
  setupAdmin,
  deleteUser,
  getShiftRules,
  updateShiftRules,
  restoreScores,
  backupScores,
  SERVER_URL
};

export default API;