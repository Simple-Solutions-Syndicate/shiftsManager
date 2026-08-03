import React, { useState } from "react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";
import API from "../API";

function SetupForm(props) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!name || !password) {
      setError("Please enter a valid name and password.");
      return;
    }

    setLoading(true);
    API.setupAdmin(name, password)
      .then(() => {
        props.onSetupComplete();
      })
      .catch((err) => {
        setError(err.error || "Error creating the administrator account.");
        setLoading(false);
      });
  };

  return (
    <Container className="mt-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
      <Row className="justify-content-center w-100">
        <Col xs={12} md={6} lg={4}>
          <h2 className="text-center mb-4">System Initialization</h2>
          <p className="text-center text-muted mb-4">
            The database is empty. Please create the first administrator account to begin.
          </p>
          
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit} className="p-4 shadow-sm" style={{ backgroundColor: "#f8f9fa", borderRadius: "10px" }}>
            <Form.Group className="mb-3">
              <Form.Label>Admin Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter admin username"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100" disabled={loading}>
              {loading ? "Creating..." : "Create Administrator"}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default SetupForm;