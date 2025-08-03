const express = require("express");
const { initDB } = require("./db/clickhouse");
const analyticsRoutes = require("./routes/analytics.routes");
const { collectDefaultMetrics } = require("prom-client");
const { createAnalyticsRateLimiter } = require("./middlewares/rateLimiter");
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

const register = require("prom-client").register;
collectDefaultMetrics({ register });

app.use(createAnalyticsRateLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "analytics-service",
    version: "1.0.0",
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/analytics", analyticsRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    service: "analytics-service",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("Analytics service error:", err);
  res.status(500).json({
    error: "Internal server error",
    service: "analytics-service",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    await initDB();

    const server = app.listen(PORT, HOST, () => {
      const address = server.address();
      const host = address.address === "::" ? "localhost" : address.address;
      console.log(`📊 Analytics Service running on ${host}:${PORT}`);
      console.log(`📈 Metrics available at http://${host}:${PORT}/metrics`);
      console.log(`🏥 Health check at http://${host}:${PORT}/health`);
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Analytics service terminated");
      });
    });
  } catch (error) {
    console.error("Failed to start Analytics service:", error);
    process.exit(1);
  }
}

startServer();
