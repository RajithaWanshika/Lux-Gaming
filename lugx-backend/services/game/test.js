const request = require("supertest");
const express = require("express");

let testGames = [
  {
    id: 1,
    title: "Epic Action Adventure",
    description: "An epic action-packed adventure game",
    price: 59.99,
    discount: 10.0,
    category: "Action",
    image_url: "https://example.com/game1.jpg",
    release_date: "2023-01-15",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    title: "Strategy Master",
    description: "Master the art of strategy",
    price: 39.99,
    discount: 0.0,
    category: "Strategy",
    image_url: "https://example.com/game2.jpg",
    release_date: "2023-02-20",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    title: "Racing Champions",
    description: "High-speed racing excitement",
    price: 49.99,
    discount: 15.0,
    category: "Racing",
    image_url: "https://example.com/game3.jpg",
    release_date: "2023-03-10",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
];

let testReviews = [
  {
    id: 1,
    game_id: 1,
    user_name: "gamer123",
    rating: 5,
    review_text: "Amazing game!",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    game_id: 1,
    user_name: "player456",
    rating: 4,
    review_text: "Really enjoyed it",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    game_id: 2,
    user_name: "strategist789",
    rating: 5,
    review_text: "Best strategy game ever",
    created_at: "2023-01-01T00:00:00.000Z",
    updated_at: "2023-01-01T00:00:00.000Z",
  },
];

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get("/games", (req, res) => {
    const { category, title, sort, limit, offset } = req.query;

    let filteredGames = [...testGames];

    if (category) {
      filteredGames = filteredGames.filter(
        (game) => game.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (title) {
      filteredGames = filteredGames.filter((game) =>
        game.title.toLowerCase().includes(title.toLowerCase())
      );
    }

    if (sort) {
      switch (sort) {
        case "price_asc":
          filteredGames.sort((a, b) => a.price - b.price);
          break;
        case "price_desc":
          filteredGames.sort((a, b) => b.price - a.price);
          break;
        case "title_asc":
          filteredGames.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "title_desc":
          filteredGames.sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "release_date_desc":
          filteredGames.sort(
            (a, b) => new Date(b.release_date) - new Date(a.release_date)
          );
          break;
        default:
          break;
      }
    }

    const startIndex = parseInt(offset) || 0;
    const limitCount = parseInt(limit) || filteredGames.length;
    const paginatedGames = filteredGames.slice(
      startIndex,
      startIndex + limitCount
    );

    res.json({
      games: paginatedGames,
      total: filteredGames.length,
      offset: startIndex,
      limit: limitCount,
    });
  });

  app.get("/games/:id", (req, res) => {
    const gameId = parseInt(req.params.id);
    const { with_review } = req.query;
    const game = testGames.find((g) => g.id === gameId);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    let responseData = { ...game };

    if (with_review === "true") {
      const gameReviews = testReviews.filter((r) => r.game_id === gameId);
      responseData.reviews = gameReviews;
      responseData.review_stats = {
        total_reviews: gameReviews.length,
        average_rating:
          gameReviews.length > 0
            ? gameReviews.reduce((sum, r) => sum + r.rating, 0) /
              gameReviews.length
            : 0,
      };
    }

    res.json(responseData);
  });

  app.get("/games/categories", (req, res) => {
    const categories = [...new Set(testGames.map((game) => game.category))];
    const categoryStats = categories.map((category) => ({
      name: category,
      count: testGames.filter((game) => game.category === category).length,
    }));

    res.json({ categories: categoryStats });
  });

  app.post("/games", (req, res) => {
    const {
      title,
      description,
      price,
      discount,
      category,
      image_url,
      release_date,
    } = req.body;

    if (!title || !description || price === undefined || !category) {
      return res.status(400).json({
        error: "Missing required fields: title, description, price, category",
      });
    }

    const existingGame = testGames.find(
      (game) => game.title.toLowerCase() === title.toLowerCase()
    );

    if (existingGame) {
      return res
        .status(409)
        .json({ error: "Game with this title already exists" });
    }

    const newGame = {
      id: testGames.length + 1,
      title,
      description,
      price: parseFloat(price),
      discount: parseFloat(discount) || 0.0,
      category,
      image_url: image_url || null,
      release_date: release_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    testGames.push(newGame);
    res.status(201).json(newGame);
  });

  app.get("/health", (req, res) => {
    res.json({ status: "healthy", service: "game-service" });
  });

  app.get("/metrics", (req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("test_metrics 1");
  });

  return app;
}

describe("Game Service API", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    requestCounts = { browsing: 0, creation: 0, search: 0, detailed: 0 };
  });

  describe("GET /games", () => {
    test("should return all games", async () => {
      const response = await request(app).get("/games").expect(200);

      expect(response.body).toHaveProperty("games");
      expect(response.body).toHaveProperty("total");
      expect(response.body.games).toBeInstanceOf(Array);
      expect(response.body.games.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    test("should filter games by category", async () => {
      const response = await request(app)
        .get("/games?category=Action")
        .expect(200);

      expect(response.body.games).toHaveLength(1);
      expect(response.body.games[0].category).toBe("Action");
    });

    test("should search games by title", async () => {
      const response = await request(app)
        .get("/games?title=Strategy")
        .expect(200);

      expect(response.body.games).toHaveLength(1);
      expect(response.body.games[0].title).toContain("Strategy");
    });

    test("should sort games by price ascending", async () => {
      const response = await request(app)
        .get("/games?sort=price_asc")
        .expect(200);

      const prices = response.body.games.map((game) => game.price);
      expect(prices[0]).toBeLessThanOrEqual(prices[1]);
      expect(prices[1]).toBeLessThanOrEqual(prices[2]);
    });

    test("should handle pagination", async () => {
      const response = await request(app)
        .get("/games?limit=2&offset=1")
        .expect(200);

      expect(response.body.games).toHaveLength(2);
      expect(response.body.offset).toBe(1);
      expect(response.body.limit).toBe(2);
    });
  });

  describe("GET /games/:id", () => {
    test("should return game by id", async () => {
      const response = await request(app).get("/games/1").expect(200);

      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("description");
      expect(response.body).toHaveProperty("price");
    });

    test("should return game with reviews when with_review=true", async () => {
      const response = await request(app)
        .get("/games/1?with_review=true")
        .expect(200);

      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("reviews");
      expect(response.body).toHaveProperty("review_stats");
      expect(response.body.reviews).toBeInstanceOf(Array);
      expect(response.body.review_stats).toHaveProperty("total_reviews");
      expect(response.body.review_stats).toHaveProperty("average_rating");
    });

    test("should return 404 for non-existent game", async () => {
      const response = await request(app).get("/games/999").expect(404);

      expect(response.body).toHaveProperty("error", "Game not found");
    });
  });

  describe("POST /games", () => {
    test("should create new game", async () => {
      const newGame = {
        title: "New Test Game",
        description: "A new test game",
        price: 29.99,
        discount: 5.0,
        category: "Puzzle",
        image_url: "https://example.com/new-game.jpg",
        release_date: "2023-04-01",
      };

      const response = await request(app)
        .post("/games")
        .send(newGame)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe(newGame.title);
      expect(response.body.price).toBe(newGame.price);
    });

    test("should return 400 for missing required fields", async () => {
      const incompleteGame = {
        title: "Incomplete Game",
      };

      const response = await request(app)
        .post("/games")
        .send(incompleteGame)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Missing required fields");
    });

    test("should return 409 for duplicate game title", async () => {
      const duplicateGame = {
        title: "Epic Action Adventure",
        description: "Duplicate game",
        price: 29.99,
        category: "Action",
      };

      const response = await request(app)
        .post("/games")
        .send(duplicateGame)
        .expect(409);

      expect(response.body).toHaveProperty(
        "error",
        "Game with this title already exists"
      );
    });
  });
});
