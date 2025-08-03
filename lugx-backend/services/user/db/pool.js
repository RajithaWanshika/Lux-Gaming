const { Pool } = require("pg");
require("dotenv").config();

const getDbUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.DATABASE_URL;
  } else if (process.env.NODE_ENV === "development") {
    return process.env.DATABASE_URL_DEV;
  } else {
    return process.env.DATABASE_URL_TEST;
  }
};

const pool = new Pool({
  connectionString: getDbUrl(),
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    const usersCount = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(usersCount.rows[0].count) === 0) {
      await insertSampleData();
    }

    console.log("✅ User database initialized successfully");

    const result = await pool.query("SELECT NOW()");
    console.log("📡 Database connection established at:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Failed to initialize User database:", error);
    throw error;
  }
}

async function insertSampleData() {
  const bcrypt = require("bcryptjs");

  const sampleUsers = [
    {
      username: "testuser1",
      email: "testuser1@example.com",
      password: "password123",
      first_name: "Test",
      last_name: "User",
    },
    {
      username: "testuser2",
      email: "testuser2@example.com",
      password: "password123",
      first_name: "Demo",
      last_name: "Account",
    },
  ];

  for (const user of sampleUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5)`,
      [user.username, user.email, passwordHash, user.first_name, user.last_name]
    );
  }

  console.log("✅ Sample users data inserted");
}

async function checkDBHealth() {
  try {
    const result = await pool.query("SELECT 1");
    return { status: "healthy", timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function closeDB() {
  try {
    await pool.end();
    console.log("📊 User database connection pool closed");
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

process.on("SIGINT", closeDB);
process.on("SIGTERM", closeDB);

module.exports = pool;
module.exports.initDB = initDB;
module.exports.checkDBHealth = checkDBHealth;
module.exports.closeDB = closeDB;
