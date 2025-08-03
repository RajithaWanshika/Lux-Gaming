const { Pool } = require("pg");
require("dotenv").config();

const getDbUrl = () => {
  let dbUrl = "";
  if (process.env.NODE_ENV === "production") {
    dbUrl = process.env.DATABASE_URL;
  } else if (process.env.NODE_ENV === "development") {
    dbUrl = process.env.DATABASE_URL_DEV;
  } else {
    dbUrl = process.env.DATABASE_URL_TEST;
  }
  return dbUrl;
};

const dbUrl = getDbUrl();

const pool = new Pool({
  connectionString: dbUrl,
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
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        discount NUMERIC(5, 2) DEFAULT 0.00,
        category VARCHAR(100),
        image_url VARCHAR(500),
        release_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        user_name VARCHAR(100) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id);
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
      DROP TRIGGER IF EXISTS update_games_updated_at ON games;
      CREATE TRIGGER update_games_updated_at 
        BEFORE UPDATE ON games 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
      CREATE TRIGGER update_reviews_updated_at 
        BEFORE UPDATE ON reviews 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    const gamesCount = await pool.query("SELECT COUNT(*) FROM games");
    if (parseInt(gamesCount.rows[0].count) === 0) {
      await insertSampleData();
    }

    console.log("✅ Game database initialized successfully");

    const result = await pool.query("SELECT NOW()");
    console.log("📡 Database connection established at:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Failed to initialize Game database:", error);
    throw error;
  }
}

async function insertSampleData() {
  const sampleGames = [
    {
      title: "Forza Horizon 4",
      description:
        "Dynamic seasons change everything in the definitive open world racing experience. Race, stunt, create and explore.",
      price: 24.99,
      discount: 38.0,
      category: "Racing",
      image_url: "/assets/images/forza-horizon-4.jpg",
      release_date: "2018-10-02",
    },
    {
      title: "PUBG: Battlegrounds",
      description:
        "PUBG: Battlegrounds is a battle royale that pits 100 players against each other.",
      price: 16.99,
      discount: 43.0,
      category: "Battle Royale",
      image_url: "/assets/images/pubg-battlegrounds.jpg",
      release_date: "2017-12-21",
    },
    {
      title: "Dota 2",
      description:
        "Every day, millions of players worldwide enter battle as one of over a hundred Dota heroes.",
      price: 0.0,
      discount: 0.0,
      category: "Strategy",
      image_url: "/assets/images/dota-2.jpg",
      release_date: "2016-07-21",
    },
  ];

  for (const game of sampleGames) {
    await pool.query(
      `INSERT INTO games (title, description, price, discount, category, image_url, release_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        game.title,
        game.description,
        game.price,
        game.discount,
        game.category,
        game.image_url,
        game.release_date ? new Date(game.release_date) : null,
      ]
    );
  }

  const sampleReviews = [
    {
      game_id: 1,
      user_name: "GamerPro123",
      rating: 5,
      review_text: "Amazing racing game! Love the seasonal changes.",
    },
    {
      game_id: 1,
      user_name: "SpeedRacer",
      rating: 4,
      review_text: "Great graphics and gameplay, highly recommended.",
    },
    {
      game_id: 1,
      user_name: "CarLover",
      rating: 5,
      review_text: "Best racing game I've ever played!",
    },
    {
      game_id: 2,
      user_name: "BattleRoyaleFan",
      rating: 4,
      review_text: "Intense battles, great with friends.",
    },
    {
      game_id: 2,
      user_name: "ShooterExpert",
      rating: 3,
      review_text: "Good game but can be frustrating sometimes.",
    },
    {
      game_id: 3,
      user_name: "StrategyMaster",
      rating: 5,
      review_text: "Deep strategy game with endless replay value.",
    },
    {
      game_id: 3,
      user_name: "MOBAPlayer",
      rating: 4,
      review_text: "Steep learning curve but very rewarding.",
    },
    {
      game_id: 3,
      user_name: "CompetitiveGamer",
      rating: 5,
      review_text: "Best MOBA game ever created!",
    },
  ];

  for (const review of sampleReviews) {
    await pool.query(
      `INSERT INTO reviews (game_id, user_name, rating, review_text) 
       VALUES ($1, $2, $3, $4)`,
      [review.game_id, review.user_name, review.rating, review.review_text]
    );
  }

  console.log("✅ Sample games data inserted");
  console.log("✅ Sample reviews data inserted");
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
    console.log("📊 Game database connection pool closed");
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
