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
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        total_items INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
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
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at 
        BEFORE UPDATE ON orders 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
      CREATE TRIGGER update_order_items_updated_at 
        BEFORE UPDATE ON order_items 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    const ordersCount = await pool.query("SELECT COUNT(*) FROM orders");
    if (parseInt(ordersCount.rows[0].count) === 0) {
      await insertSampleData();
    }

    console.log("✅ Order database initialized successfully");

    const result = await pool.query("SELECT NOW()");
    console.log("📡 Database connection established at:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Failed to initialize Order database:", error);
    throw error;
  }
}

async function insertSampleData() {
  const sampleOrders = [
    {
      user_id: 1,
      status: "completed",
      total: 84.98,
      total_items: 2,
    },
    {
      user_id: 2,
      status: "pending",
      total: 59.99,
      total_items: 1,
    },
    {
      user_id: 1,
      status: "cancelled",
      total: 16.99,
      total_items: 1,
    },
  ];

  for (const order of sampleOrders) {
    await pool.query(
      `INSERT INTO orders (user_id, status, total, total_items) 
       VALUES ($1, $2, $3, $4)`,
      [order.user_id, order.status, order.total, order.total_items]
    );
  }

  const sampleOrderItems = [
    {
      order_id: 1,
      game_id: 1,
      quantity: 1,
      unit_price: 24.99,
      total_price: 24.99,
    },
    {
      order_id: 1,
      game_id: 2,
      quantity: 1,
      unit_price: 59.99,
      total_price: 59.99,
    },
    {
      order_id: 2,
      game_id: 1,
      quantity: 1,
      unit_price: 59.99,
      total_price: 59.99,
    },
    {
      order_id: 3,
      game_id: 2,
      quantity: 1,
      unit_price: 16.99,
      total_price: 16.99,
    },
  ];

  for (const item of sampleOrderItems) {
    await pool.query(
      `INSERT INTO order_items (order_id, game_id, quantity, unit_price, total_price) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        item.order_id,
        item.game_id,
        item.quantity,
        item.unit_price,
        item.total_price,
      ]
    );
  }

  console.log("✅ Sample orders data inserted");
  console.log("✅ Sample order items data inserted");
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
    console.log("📊 Order database connection pool closed");
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
