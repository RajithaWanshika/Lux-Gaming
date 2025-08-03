const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

let testUsers = [
  {
    id: 1,
    username: "testuser1",
    email: "testuser1@example.com",
    password_hash: bcrypt.hashSync("password123", 10),
    first_name: "Test",
    last_name: "User",
    is_active: true,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
  },
  {
    id: 2,
    username: "testuser2",
    email: "testuser2@example.com",
    password_hash: bcrypt.hashSync("password123", 10),
    first_name: "Demo",
    last_name: "Account",
    is_active: true,
    created_at: new Date("2024-01-02"),
    updated_at: new Date("2024-01-02"),
  },
];

const app = express();
app.use(express.json());

const testAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, "test-secret");
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "TOKEN_INVALID" });
    }
  } else {
    return res.status(401).json({ error: "TOKEN_MISSING" });
  }
};

let requestCounts = {
  registration: 0,
  login: 0,
  general: 0,
};

const testRateLimiters = {
  registration: (req, res, next) => {
    requestCounts.registration++;
    if (requestCounts.registration > 5) {
      return res.status(429).json({
        error: "Too many accounts created",
        code: "REGISTRATION_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
  login: (req, res, next) => {
    requestCounts.login++;
    if (requestCounts.login > 5) {
      return res.status(429).json({
        error: "Too many login attempts",
        code: "LOGIN_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
  general: (req, res, next) => {
    requestCounts.general++;
    if (requestCounts.general > 50) {
      return res.status(429).json({
        error: "Too many requests",
        code: "USER_OPERATIONS_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
};

app.post("/register", testRateLimiters.registration, async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: "Username, email and password are required",
    });
  }

  const existingUser = testUsers.find(
    (u) => u.username === username || u.email === email
  );
  if (existingUser) {
    return res.status(409).json({
      error: "User already exists with this username or email",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = {
    id: testUsers.length + 1,
    username,
    email,
    password_hash: passwordHash,
    first_name: first_name || null,
    last_name: last_name || null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  testUsers.push(newUser);

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    },
  });
});

app.post("/login", testRateLimiters.login, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required",
    });
  }

  const user = testUsers.find(
    (u) => u.username === username || u.email === username
  );
  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    "test-secret",
    { expiresIn: "24h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
});

app.get("/users", testRateLimiters.general, (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  let filteredUsers = [...testUsers];

  if (search) {
    filteredUsers = testUsers.filter(
      (user) =>
        user.username.includes(search) ||
        user.email.includes(search) ||
        (user.first_name && user.first_name.includes(search)) ||
        (user.last_name && user.last_name.includes(search))
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const usersWithoutPassword = paginatedUsers.map(
    ({ password_hash, ...user }) => user
  );

  res.json({
    users: usersWithoutPassword,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredUsers.length / limit),
      totalUsers: filteredUsers.length,
      hasNextPage: page < Math.ceil(filteredUsers.length / limit),
      hasPrevPage: page > 1,
    },
    filters: { search },
  });
});

app.get("/users/:id", testRateLimiters.general, (req, res) => {
  const userId = parseInt(req.params.id);
  const user = testUsers.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password_hash, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.post("/users", testAuth, testRateLimiters.general, async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: "Username, email and password are required",
    });
  }

  const existingUser = testUsers.find(
    (u) => u.username === username || u.email === email
  );
  if (existingUser) {
    return res.status(409).json({
      error: "Username or email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = {
    id: testUsers.length + 1,
    username,
    email,
    password_hash: passwordHash,
    first_name: first_name || null,
    last_name: last_name || null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  testUsers.push(newUser);

  const { password_hash: _, ...userResponse } = newUser;
  res.status(201).json({
    message: "User created successfully",
    user: userResponse,
  });
});

app.put("/users/:id", testAuth, testRateLimiters.general, (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, email, first_name, last_name, is_active } = req.body;

  const userIndex = testUsers.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  if (username) testUsers[userIndex].username = username;
  if (email) testUsers[userIndex].email = email;
  if (first_name) testUsers[userIndex].first_name = first_name;
  if (last_name) testUsers[userIndex].last_name = last_name;
  if (is_active !== undefined) testUsers[userIndex].is_active = is_active;
  testUsers[userIndex].updated_at = new Date();

  const { password_hash, ...userResponse } = testUsers[userIndex];
  res.json({
    message: "User updated successfully",
    user: userResponse,
  });
});

app.delete("/users/:id", testAuth, testRateLimiters.general, (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = testUsers.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const deletedUser = testUsers.splice(userIndex, 1)[0];
  res.json({
    message: "User deleted successfully",
    deletedUser: {
      id: deletedUser.id,
      username: deletedUser.username,
    },
  });
});

describe("User Service API", () => {
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign({ id: 1, username: "testuser1" }, "test-secret");
  });

  beforeEach(() => {
    requestCounts = {
      registration: 0,
      login: 0,
      general: 0,
    };

    testUsers = [
      {
        id: 1,
        username: "testuser1",
        email: "testuser1@example.com",
        password_hash: bcrypt.hashSync("password123", 10),
        first_name: "Test",
        last_name: "User",
        is_active: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
      },
      {
        id: 2,
        username: "testuser2",
        email: "testuser2@example.com",
        password_hash: bcrypt.hashSync("password123", 10),
        first_name: "Demo",
        last_name: "Account",
        is_active: true,
        created_at: new Date("2024-01-02"),
        updated_at: new Date("2024-01-02"),
      },
    ];
  });

  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      const newUser = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        first_name: "New",
        last_name: "User",
      };

      const response = await request(app).post("/register").send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User created successfully");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username", "newuser");
      expect(response.body.user).toHaveProperty("email", "newuser@example.com");
    });

    it("should reject registration without required fields", async () => {
      const response = await request(app)
        .post("/register")
        .send({ username: "test" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Username, email and password are required"
      );
    });

    it("should reject duplicate username", async () => {
      const duplicateUser = {
        username: "testuser1",
        email: "different@example.com",
        password: "password123",
      };

      const response = await request(app).post("/register").send(duplicateUser);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(
        "User already exists with this username or email"
      );
    });
  });

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await request(app).post("/login").send({
        username: "testuser1",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("username", "testuser1");
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/login").send({
        username: "testuser1",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("GET /users", () => {
    it("should return users with pagination", async () => {
      const response = await request(app).get("/users");

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(2);
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.users[0]).not.toHaveProperty("password_hash");
    });

    it("should filter users by search", async () => {
      const response = await request(app).get("/users?search=testuser1");

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].username).toBe("testuser1");
    });
  });

  describe("GET /users/:id", () => {
    it("should return specific user", async () => {
      const response = await request(app).get("/users/1");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("username", "testuser1");
      expect(response.body).not.toHaveProperty("password_hash");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app).get("/users/999");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("User not found");
    });
  });

  describe("PUT /users/:id", () => {
    it("should update user successfully", async () => {
      const response = await request(app)
        .put("/users/1")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ first_name: "Updated" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User updated successfully");
      expect(response.body.user.first_name).toBe("Updated");
    });
  });

  describe("DELETE /users/:id", () => {
    it("should delete user successfully", async () => {
      const response = await request(app)
        .delete("/users/2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User deleted successfully");
    });
  });

  describe("Authentication", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).post("/users").send({
        username: "test",
        email: "test@test.com",
        password: "password",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("TOKEN_MISSING");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .put("/users/1")
        .set("Authorization", "Bearer invalid-token")
        .send({ first_name: "Test" });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("TOKEN_INVALID");
    });
  });
});

module.exports = app;
