const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const authenticateToken = require("./middlewares/authenticateToken");
const { register } = require("./metrics/metrics");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST;

const getServiceUrl = (service) => {
  if (process.env.NODE_ENV === "production") {
    return process.env[`${service.toUpperCase()}_SERVICE_URL`];
  } else if (process.env.NODE_ENV === "development") {
    return process.env[`${service.toUpperCase()}_SERVICE_URL_DEV`];
  } else {
    return process.env[`${service.toUpperCase()}_SERVICE_URL_TEST`];
  }
};

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "api-gateway",
    version: "1.0.0",
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.post("/auth/login", async (req, res) => {
  try {
    const userServiceUrl = getServiceUrl("user");
    const response = await fetch(`${userServiceUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const userServiceUrl = getServiceUrl("user");
    const response = await fetch(`${userServiceUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration service unavailable" });
  }
});

app.use(
  "/api/users",
  createProxyMiddleware({
    target: getServiceUrl("user"),
    changeOrigin: true,
    pathRewrite: { "^/api/users": "/users" },
    onError: (err, req, res) => {
      console.error("User service error:", err);
      res.status(503).json({ error: "User service unavailable" });
    },
  })
);

app.use(
  "/api/games",
  createProxyMiddleware({
    target: getServiceUrl("game"),
    changeOrigin: true,
    pathRewrite: { "^/api/games": "/games" },
    onError: (err, req, res) => {
      console.error("Game service error:", err);
      res.status(503).json({ error: "Game service unavailable" });
    },
  })
);

app.use(
  "/api/orders",
  authenticateToken,
  createProxyMiddleware({
    target: getServiceUrl("order"),
    changeOrigin: true,
    pathRewrite: { "^/api/orders": "/orders" },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("X-User-ID", req.user.id);
        proxyReq.setHeader("X-User-Email", req.user.email);
      }
    },
    onError: (err, req, res) => {
      console.error("Order service error:", err);
      res.status(503).json({ error: "Order service unavailable" });
    },
  })
);

app.use(
  "/api/analytics",
  createProxyMiddleware({
    target: getServiceUrl("analytics"),
    changeOrigin: true,
    pathRewrite: { "^/api/analytics": "/analytics" },
    onError: (err, req, res) => {
      console.error("Analytics service error:", err);
      res.status(503).json({ error: "Analytics service unavailable" });
    },
  })
);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("Gateway error:", err);
  res.status(500).json({
    error: "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    console.log("HTTP server closed");

    try {
      await pool.end();
      console.log("Database connections closed");

      console.log("API Gateway service terminated");
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

const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  const host = address.address === "::" ? "localhost" : address.address;
  console.log(`🚀 API Gateway running on ${host}:${PORT}`);
  console.log(`📊 Metrics available at http://${host}:${PORT}/metrics`);
  console.log(`🏥 Health check at http://${host}:${PORT}/health`);
});
