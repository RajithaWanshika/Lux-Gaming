const express = require("express");
const { initDB } = require("./db/pool");
const gameRoutes = require("./routes/gameRoutes");
const { collectDefaultMetrics } = require("prom-client");
const { register } = require("./metrics/metrics");
const strictRouteValidator = require("./middlewares/strictRouteValidator");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

collectDefaultMetrics({ register });

const allowedRoutes = [
  {
    method: "GET",
    path: "/games",
    requiredParamsCount: 0,
    allowedQueryParams: ["page", "limit", "search", "category", "sort"],
  },
  {
    method: "GET",
    path: "/games/:id",
    requiredParamsCount: 1,
    allowedQueryParams: ["with_review"],
  },
  {
    method: "POST",
    path: "/games",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/games/batch",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "PUT",
    path: "/games/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "DELETE",
    path: "/games/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/games/categories",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/health",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/health/game",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/metrics",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/metrics/game",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
];

app.use(strictRouteValidator(allowedRoutes));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "game-service",
    version: "1.0.0",
  });
});

app.get("/health/game", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "game-service",
    version: "1.0.0",
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/metrics/game", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/games", gameRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    service: "game-service",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("Game service error:", err);
  res.status(500).json({
    error: "Internal server error",
    service: "game-service",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    await initDB();

    const server = app.listen(PORT, HOST, () => {
      const address = server.address();
      const host = address.address === "::" ? "localhost" : address.address;

      console.log(`🎮 Game Service running on ${host}:${PORT}`);
      console.log(`📊 Metrics available at http://${host}:${PORT}/metrics`);
      console.log(
        `📊 Metrics available at http://${host}:${PORT}/metrics/game`
      );
      console.log(`🏥 Health check at http://${host}:${PORT}/health`);
      console.log(`🏥 Health check at http://${host}:${PORT}/health/game`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        console.log("HTTP server closed");

        try {
          await pool.end();
          console.log("Database connections closed");

          console.log("Game service terminated");
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2"));
    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      shutdown("uncaughtException");
    });
  } catch (error) {
    console.error("Failed to start Game service:", error);
    process.exit(1);
  }
}

startServer();
