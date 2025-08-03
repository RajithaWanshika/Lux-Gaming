const pool = require("../db/pool");
const { userCreations, userLogins } = require("../metrics/metrics");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const trim = (value) => {
  return value ? value.trim() : "";
};

const requestValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({ error: "Validation failed", details: errors.array() });
    return false;
  }
  return true;
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

exports.register = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const { username, email, password, first_name, last_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email and password are required",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [trim(username), trim(email)]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "User already exists with this username or email",
      });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, email, first_name, last_name, created_at, updated_at`,
      [
        trim(username),
        trim(email),
        passwordHash,
        trim(first_name) || null,
        trim(last_name) || null,
      ]
    );

    const user = result.rows[0];

    if (userCreations?.inc) {
      userCreations.inc();
    }

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [trim(username)]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    if (userLogins?.inc) {
      userLogins.inc();
    }

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
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.addUser = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const { username, email, password, first_name, last_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email and password are required",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, email, first_name, last_name, created_at, updated_at`,
      [
        trim(username),
        trim(email),
        passwordHash,
        trim(first_name) || null,
        trim(last_name) || null,
      ]
    );

    if (userCreations?.inc) {
      userCreations.inc();
    }

    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Add user error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(trim(req.query.page)) || 1;
    const limit = parseInt(trim(req.query.limit)) || 10;
    const search = trim(req.query.search) || "";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(
        `(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const usersQuery = `
      SELECT id, username, email, first_name, last_name, is_active, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;

    queryParams.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
      },
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await pool.query(
      "SELECT id, username, email, first_name, last_name, is_active, created_at, updated_at FROM users WHERE id = $1",
      [trim(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const { id } = req.params;
    const { username, email, first_name, last_name, is_active } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [
      trim(id),
    ]);

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username), 
           email = COALESCE($2, email),
           first_name = COALESCE($3, first_name),
           last_name = COALESCE($4, last_name),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 
       RETURNING id, username, email, first_name, last_name, is_active, created_at, updated_at`,
      [
        username ? trim(username) : null,
        email ? trim(email) : null,
        first_name ? trim(first_name) : null,
        last_name ? trim(last_name) : null,
        is_active,
        id,
      ]
    );

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Update user error:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, username",
      [trim(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
      deletedUser: result.rows[0],
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};
