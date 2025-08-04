const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const orderRoutes = require("./routes/orderRoutes");
const { initDB } = require("./db/pool");
const { collectDefaultMetrics } = require("prom-client");
const strictRouteValidator = require("./middlewares/strictRouteValidator");
const authenticateToken = require("./middlewares/authenticateToken");
const { register } = require("./metrics/metrics");

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
    path: "/orders",
    requiredParamsCount: 0,
    allowedQueryParams: ["page", "limit", "status"],
  },
  {
    method: "GET",
    path: "/orders/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/orders",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "PUT",
    path: "/orders/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "DELETE",
    path: "/orders/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/orders/:id/cancel",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "GET",
    path: "/orders/:id/status",
    requiredParamsCount: 1,
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
    path: "/health/order",
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
    path: "/metrics/order",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
];

app.use(strictRouteValidator(allowedRoutes));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "order-service",
    version: "1.0.0",
  });
});

app.get("/health/order", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "order-service",
    version: "1.0.0",
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/metrics/order", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/orders", authenticateToken, orderRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    service: "order-service",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("Order service error:", err);
  res.status(500).json({
    error: "Internal server error",
    service: "order-service",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    await initDB();

    const server = app.listen(PORT, HOST, () => {
      const address = server.address();
      const host = address.address === "::" ? "localhost" : address.address;
      console.log(`🛒 Order Service running on ${host}:${PORT}`);
      console.log(`📊 Metrics available at http://${host}:${PORT}/metrics`);
      console.log(
        `📊 Metrics available at http://${host}:${PORT}/metrics/order`
      );
      console.log(`🏥 Health check at http://${host}:${PORT}/health`);
      console.log(`🏥 Health check at http://${host}:${PORT}/health/order`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        console.log("HTTP server closed");

        try {
          await pool.end();
          console.log("Database connections closed");

          console.log("Order service terminated");
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
    console.error("Failed to start Order service:", error);
    process.exit(1);
  }
}

startServer();
