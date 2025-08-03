const pool = require("../db/pool");
const {
  gameCreations,
  gameViews,
  httpRequestTotal,
  databaseOperationDuration,
  gameSearches,
} = require("../metrics/metrics");
const { validationResult } = require("express-validator");

const trim = (value) => {
  return value ? value.trim() : "";
};

const formatDate = (date) => {
  const formattedDate = date && !isNaN(new Date(date)) ? new Date(date) : null;
  return formattedDate;
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

exports.addGame = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const {
      title,
      description,
      price,
      discount,
      category,
      image_url,
      release_date,
    } = req.body;

    if (!title || price === undefined) {
      return res.status(400).json({
        error: "Title and price are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO games (
        title, description, price, discount, category, image_url, release_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        trim(title),
        trim(description),
        parseFloat(price),
        discount ? parseFloat(discount) : 0,
        trim(category) || null,
        trim(image_url) || null,
        formatDate(release_date),
      ]
    );

    if (gameCreations?.inc) {
      gameCreations.inc({ category: category || "unknown" });
    }

    res.status(201).json({
      message: "Game added successfully",
      game: result.rows[0],
    });
  } catch (err) {
    console.error("Add game error:", err);
    res.status(500).json({ error: "Failed to add game" });
  }
};

exports.addGameMultiBatch = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;
    const games = req.body;

    if (!Array.isArray(games) || games.length === 0) {
      return res
        .status(400)
        .json({ error: "Request body must be a non-empty array" });
    }

    for (const game of games) {
      if (!game.title || game.price === undefined) {
        return res.status(400).json({
          error: "Each game must have title and price",
        });
      }
    }

    const columns = [
      "title",
      "description",
      "price",
      "discount",
      "category",
      "image_url",
      "release_date",
    ];

    const valuesClause = [];
    const values = [];

    games.forEach((game, i) => {
      const baseIndex = i * columns.length;
      const placeholders = columns.map((_, idx) => `$${baseIndex + idx + 1}`);
      valuesClause.push(`(${placeholders.join(", ")})`);

      values.push(
        trim(game.title),
        trim(game.description) || null,
        parseFloat(game.price),
        game.discount ? parseFloat(game.discount) : 0,
        trim(game.category) || null,
        trim(game.image_url) || null,
        formatDate(game.release_date)
      );
    });

    const query = `
      INSERT INTO games (${columns.join(", ")})
      VALUES ${valuesClause.join(", ")}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (gameCreations?.inc) {
      result.rows.forEach((row) => {
        gameCreations.inc({ category: row.category || "unknown" });
      });
    }

    res.status(201).json({
      message: "Games added successfully",
      games: result.rows,
    });
  } catch (err) {
    console.error("Batch add games error:", err);
    res.status(500).json({ error: "Failed to add games" });
  }
};

exports.getGames = async (req, res) => {
  try {
    const startTime = Date.now();
    const page = parseInt(trim(req.query.page)) || 1;
    const limit = parseInt(trim(req.query.limit)) || 20;
    const search = trim(req.query.search) || null;
    const category = trim(req.query.category) || null;
    const sort = trim(req.query.sort) || "title";
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(
        `(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      );
      queryParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    let orderBy = "ORDER BY ";
    switch (sort) {
      case "name":
        orderBy += "title ASC";
        break;
      case "price":
        orderBy += "price DESC";
        break;
      case "newest":
        orderBy += "release_date DESC NULLS LAST";
        break;
      case "oldest":
        orderBy += "release_date ASC NULLS LAST";
        break;
      default:
        orderBy += "release_date DESC NULLS LAST";
    }

    const query = `
      SELECT id, title, description, price, discount, category, image_url, release_date, created_at, updated_at
      FROM games 
      ${whereClause} 
      ${orderBy} 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countQuery = `SELECT COUNT(*) FROM games ${whereClause}`;

    queryParams.push(limit, offset);

    const [gamesResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ]);

    httpRequestTotal.inc({
      method: "GET",
      endpoint: "/games",
      status_code: 200,
    });
    const durationSeconds = (Date.now() - startTime) / 1000;

    databaseOperationDuration.observe(durationSeconds, {
      operation: "get_games",
    });

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      games: gamesResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalGames: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        category,
        sort,
      },
    });
    gameSearches.inc({ search_term: search, category, sort });
  } catch (err) {
    console.error("Get games error:", err);
    res.status(500).json({ error: "Failed to fetch games" });
  }
};

exports.getGameById = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;
    const startTime = Date.now();
    const { id } = req.params;
    const withReview = req.query.with_review === "true";

    if (!id) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    let gameQuery = "SELECT * FROM games WHERE id = $1";
    const gameResult = await pool.query(gameQuery, [trim(id)]);

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    const game = gameResult.rows[0];

    if (withReview) {
      const reviewsQuery = `
        SELECT id, user_name, rating, review_text, created_at, updated_at 
        FROM reviews 
        WHERE game_id = $1 
        ORDER BY created_at DESC
      `;
      const reviewsResult = await pool.query(reviewsQuery, [trim(id)]);

      const avgRatingQuery = `
        SELECT AVG(rating)::NUMERIC(3,2) as avg_rating, COUNT(*) as review_count 
        FROM reviews 
        WHERE game_id = $1
      `;
      const avgRatingResult = await pool.query(avgRatingQuery, [trim(id)]);

      game.reviews = reviewsResult.rows;
      game.avg_rating = avgRatingResult.rows[0].avg_rating || 0;
      game.review_count = parseInt(avgRatingResult.rows[0].review_count) || 0;
    }

    gameViews.inc({ id, category: game.category || "unknown" });
    httpRequestTotal.inc({
      method: "GET",
      endpoint: "/games/:id",
      status_code: 200,
    });

    const durationSeconds = (Date.now() - startTime) / 1000;
    databaseOperationDuration.observe(durationSeconds, {
      operation: "get_game_by_id",
    });
    res.json(game);
  } catch (err) {
    console.error("Get game by ID error:", err);
    res.status(500).json({ error: "Failed to fetch game" });
  }
};

exports.updateGame = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;
    const startTime = Date.now();
    const { id } = req.params;
    const updateFields = req.body;

    if (!id) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    const gameExists = await pool.query("SELECT id FROM games WHERE id = $1", [
      trim(id),
    ]);
    if (gameExists.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    const allowedFields = [
      "title",
      "description",
      "price",
      "discount",
      "category",
      "image_url",
      "release_date",
    ];
    const filteredFields = {};

    Object.keys(updateFields).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredFields[key] = updateFields[key];
      }
    });

    const updateKeys = Object.keys(filteredFields);
    if (updateKeys.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const setClause = updateKeys
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ");

    const query = `
      UPDATE games 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const queryParams = [
      id,
      ...updateKeys.map((key) => {
        if (key === "release_date") {
          return formatDate(filteredFields[key]);
        }
        return filteredFields[key];
      }),
    ];

    const result = await pool.query(query, queryParams);

    const durationSeconds = (Date.now() - startTime) / 1000;
    databaseOperationDuration.observe(durationSeconds, {
      operation: "update_game",
    });

    res.json({
      message: "Game updated successfully",
      game: result.rows[0],
    });
  } catch (err) {
    console.error("Update game error:", err);
    res.status(500).json({ error: "Failed to update game" });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;
    const startTime = Date.now();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Game ID is required" });
    }

    const result = await pool.query(
      "DELETE FROM games WHERE id = $1 RETURNING id, title",
      [trim(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({
      message: "Game deleted successfully",
      deletedGame: result.rows[0],
    });
    const durationSeconds = (Date.now() - startTime) / 1000;
    databaseOperationDuration.observe(durationSeconds, {
      operation: "delete_game",
    });
  } catch (err) {
    console.error("Delete game error:", err);
    res.status(500).json({ error: "Failed to delete game" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await pool.query(
      "SELECT category, COUNT(*) as count FROM games WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC"
    );

    res.json({
      categories: result.rows,
    });
    const durationSeconds = (Date.now() - startTime) / 1000;
    databaseOperationDuration.observe(durationSeconds, {
      operation: "get_categories",
    });
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};
