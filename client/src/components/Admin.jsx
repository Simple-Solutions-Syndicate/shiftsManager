import API from "../API";
import React, { useState, useEffect } from "react";
import { Form, Button, Container, Row, Col, Table } from "react-bootstrap";
import { Typeahead } from "react-bootstrap-typeahead";

function AdminRoute(props) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [score, setScore] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [newScore, setNewScore] = useState("");
  const [userToDelete, setUserToDelete] = useState("");

  const [rules, setRules] = useState([]);

  const users = props.users;
  const setDirty = props.setDirty;

  useEffect(() => {
    API.getShiftRules()
      .then((data) => setRules(data))
      .catch((err) => console.error(err));
  }, []);

  const handleDownload = () => {
    if (!month || !year) {
      alert("Please, insert year and month");
      return;
    }
    const downloadUrl = `${API.SERVER_URL}shifts?month=${month}&year=${year}`;
    window.location.href = downloadUrl;
  };

  const handleAddUser = () => {
    if (!name || !password) {
      alert("Please fill in name and password.");
      return;
    }
    API.addUser(name, role, password, score)
      .then((res) => {
        setDirty(true);
        setName('');
        setRole('user');
        setScore('');
        setPassword('');
        alert(res.message || "Utente aggiunto con successo!");
      })
      .catch((err) => {
        console.error(err);
        alert(err.error || err.message || "Errore durante l'aggiunta dell'utente.");
      });
  };

  const handleEditScore = () => {
    if (!selectedUser || !newScore) {
      alert("Please select a user and enter a new score.");
      return;
    }
    API.patchScore(selectedUser.id, newScore)
      .then((res) => {
        setDirty(true);
        setSelectedUser('');
        setNewScore('');
        alert(res.message || "Punteggio modificato con successo!");
      })
      .catch((err) => {
        console.error(err);
        alert(err.error || err.message || "Errore durante la modifica del punteggio.");
      });
  };

  const handleBackupScores = () => {
    API.backupScores()
      .then((res) => alert(res.message || "Backup dei punteggi eseguito con successo!"))
      .catch((err) => {
        console.error(err);
        alert(err.error || err.message || "Errore durante il backup dei punteggi.");
      });
  };

  const handleRestoreScores = () => {
    if (!window.confirm("Sei sicuro di voler ripristinare i punteggi dal backup precedente?")) {
      return;
    }
    API.restoreScores()
      .then((res) => {
        setDirty(true);
        alert(res.message || "Ripristino dei punteggi completato con successo!");
      })
      .catch((err) => {
        console.error(err);
        alert(err.error || err.message || "Nessun backup trovato o errore durante il ripristino.");
      });
  };

  const handlePersonSelect = (selected) => {
    const person = selected[0];
    setSelectedUser(person);
    setNewScore("");
  };

  const handleDeleteUser = () => {
    if (!userToDelete) {
      alert("Please select a user to delete.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`)) {
      API.deleteUser(userToDelete.id)
        .then((res) => {
          setDirty(true);
          setUserToDelete("");
          alert(res.message || "Utente eliminato con successo.");
        })
        .catch((err) => {
          console.error(err);
          alert(err.error || err.message || "Errore durante l'eliminazione dell'utente.");
        });
    }
  };

  const handleRuleChange = (dayOfWeek, value) => {
    const updatedRules = rules.map((rule) => {
      if (rule.day_of_week === dayOfWeek) {
        return { ...rule, num_people: parseInt(value) || 0 };
      }
      return rule;
    });
    setRules(updatedRules);
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    API.updateShiftRules(rules)
      .then(() => alert("Rules updated successfully!"))
      .catch((err) => console.error(err));
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Container className="mt-5">

      <h2 className="text-center mt-5 mb-4">Shift Configuration (Days & People)</h2>

      <Form
        onSubmit={handleSaveRules}
        className="mb-5 p-4"
        style={{ backgroundColor: "#e2e3e5", borderRadius: "10px" }}
      >
        <Row className="justify-content-center">
          <Col xs={12} md={8}>
            <Table striped bordered hover className="text-center bg-white">
              <thead>
                <tr>
                  <th>Day of the Week</th>
                  <th>Number of People (0 - 10)</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.day_of_week}>
                    <td className="align-middle fw-bold">{dayNames[rule.day_of_week]}</td>
                    <td>
                      <Form.Control
                        type="number"
                        min="0"
                        max="10"
                        value={rule.num_people}
                        onChange={(e) => handleRuleChange(rule.day_of_week, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>

        <Row className="justify-content-center mt-3">
          <Col xs={12} md={6} lg={4} className="text-center">
            <Button variant="dark" type="submit" className="w-100">
              Save Configuration
            </Button>
          </Col>
        </Row>
      </Form>

      <h2 className="text-center mt-5 mb-4">Generate and Download Shifts</h2>

      <Form
        className="mb-5 p-4"
        style={{ backgroundColor: "#f8f9fa", borderRadius: "10px" }}
      >
        <Row className="justify-content-center mb-3">
          <Col xs={12} md={6} lg={4} className="d-flex gap-2">
            <Button variant="secondary" className="w-50" onClick={handleBackupScores}>
              Backup Punteggi
            </Button>
            <Button variant="outline-secondary" className="w-50" onClick={handleRestoreScores}>
              Ripristina Backup
            </Button>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Month</Form.Label>
              <Form.Control
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="Insert month (e.g., 09)"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Year</Form.Label>
              <Form.Control
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Insert year (e.g., 2026)"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4} className="text-center">
            <Button
              variant="primary"
              className="w-100"
              onClick={handleDownload}
            >
              Download Markdown File
            </Button>
          </Col>
        </Row>
      </Form>

      <h2 className="text-center mt-5 mb-4">Add New User</h2>

      <Form
        className="mb-5 p-4"
        style={{ backgroundColor: "#f1f3f5", borderRadius: "10px" }}
      >
        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>Score</Form.Label>
              <Form.Control
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter user score"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4} className="text-center">
            <Button variant="success" className="w-100" onClick={handleAddUser}>
              Add User
            </Button>
          </Col>
        </Row>
      </Form>

      <h2 className="text-center mt-5 mb-4">Edit User Score</h2>

      <Form
        className="mb-5 p-4"
        style={{ backgroundColor: "#e9ecef", borderRadius: "10px" }}
      >
        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group controlId="personSelect">
              <Form.Label>Select User</Form.Label>
              <Typeahead
                id="person-typeahead"
                labelKey="name"
                options={users || []}
                placeholder="Select a user..."
                onChange={handlePersonSelect}
                selected={selectedUser ? [selectedUser] : []}
                highlightOnlyResult
              />
            </Form.Group>
          </Col>
        </Row>

        {selectedUser && (
          <Row className="justify-content-center mb-3">
            <Col xs={12} md={6} lg={4}>
              <Form.Group className="mb-3">
                <Form.Label>Current Score</Form.Label>
                <Form.Control
                  readOnly
                  value={selectedUser?.score}
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group className="mb-3">
              <Form.Label>New Score</Form.Label>
              <Form.Control
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Enter new score"
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4} className="text-center">
            <Button
              variant="warning"
              className="w-100"
              onClick={handleEditScore}
              disabled={!newScore || !selectedUser}
            >
              Update Score
            </Button>
          </Col>
        </Row>
      </Form>

      <h2 className="text-center mt-5 mb-4 text-danger">Delete User</h2>

      <Form
        className="mb-5 p-4"
        style={{ backgroundColor: "#f8d7da", borderRadius: "10px" }}
      >
        <Row className="justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Form.Group controlId="deletePersonSelect">
              <Form.Label>Select User to Delete</Form.Label>
              <Typeahead
                id="delete-person-typeahead"
                labelKey="name"
                options={users || []}
                placeholder="Select a user..."
                onChange={(selected) => setUserToDelete(selected[0])}
                selected={userToDelete ? [userToDelete] : []}
                highlightOnlyResult
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="justify-content-center mt-3">
          <Col xs={12} md={6} lg={4} className="text-center">
            <Button
              variant="danger"
              className="w-100"
              onClick={handleDeleteUser}
              disabled={!userToDelete}
            >
              Delete User
            </Button>
          </Col>
        </Row>
      </Form>

    </Container>
  );
}

export default AdminRoute;