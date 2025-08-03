const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const testAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, "test-secret");
      req.user = decoded;
    } catch (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
  }
  next();
};

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("# API Gateway metrics\ngateway_requests_total 1\n");
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "testuser" && password === "password123") {
    const token = jwt.sign({ id: 1, username }, "test-secret", {
      expiresIn: "1h",
    });
    res.json({ token, user: { id: 1, username } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const token = jwt.sign({ id: 1, username, email }, "test-secret", {
    expiresIn: "1h",
  });
  res.status(201).json({
    message: "User created successfully",
    token,
    user: { id: 1, username, email },
  });
});

app.get("/api/users/profile", testAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ id: req.user.id, username: req.user.username });
});

describe("API Gateway Service", () => {

  describe("Health Check", () => {
    it("should return service status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("api-gateway");
    });
  });

  describe("Metrics", () => {
    it("should return Prometheus metrics", async () => {
      const response = await request(app).get("/metrics");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe(
        "text/plain; charset=utf-8"
      );
      expect(response.text).toContain("gateway_requests_total");
    });
  });

  describe("Authentication", () => {
    it("should authenticate valid user", async () => {
      const response = await request(app).post("/auth/login").send({
        username: "testuser",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.username).toBe("testuser");
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        username: "testuser",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should register new user", async () => {
      const response = await request(app).post("/auth/register").send({
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User created successfully");
      expect(response.body).toHaveProperty("token");
    });

    it("should reject registration with missing fields", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ username: "test" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should require authentication for protected routes", async () => {
      const response = await request(app).get("/api/users/profile");

      expect(response.status).toBe(401);
    });

    it("should work with valid token", async () => {
      const token = jwt.sign({ id: 1, username: "testuser" }, "test-secret", {
        expiresIn: "1h",
      });

      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.username).toBe("testuser");
    });
  });



  describe("Request Validation", () => {
    it("should reject invalid JSON", async () => {
      const response = await request(app)
        .post("/auth/login")
        .set("Content-Type", "application/json")
        .send("invalid json")
        .expect(400);
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 errors", async () => {
      const response = await request(app).get("/non-existent-endpoint");

      expect(response.status).toBe(404);
    });
  });
});

module.exports = app;
