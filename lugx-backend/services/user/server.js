const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const userRoutes = require("./routes/userRoutes");
const { initDB } = require("./db/pool");
const { collectDefaultMetrics } = require("prom-client");
const strictRouteValidator = require("./middlewares/strictRouteValidator");
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
    path: "/users",
    requiredParamsCount: 0,
    allowedQueryParams: ["page", "limit", "search"],
  },
  {
    method: "GET",
    path: "/users/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/users",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "PUT",
    path: "/users/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "DELETE",
    path: "/users/:id",
    requiredParamsCount: 1,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/login",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
  {
    method: "POST",
    path: "/register",
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
    path: "/health/user",
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
    path: "/metrics/user",
    requiredParamsCount: 0,
    allowedQueryParams: [],
  },
];

app.use(strictRouteValidator(allowedRoutes));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "user-service",
    version: "1.0.0",
  });
});

app.get("/health/user", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "user-service",
    version: "1.0.0",
  });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/metrics/user", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const {
  login,
  register: registerUser,
} = require("./controllers/userController");
const { body } = require("express-validator");

const registerValidation = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("first_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("First name must be less than 50 characters"),
  body("last_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Last name must be less than 50 characters"),
];

app.post("/login", login);
app.post("/register", registerValidation, registerUser);
app.use("/users", userRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    service: "user-service",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("User service error:", err);
  res.status(500).json({
    error: "Internal server error",
    service: "user-service",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    await initDB();

    const server = app.listen(PORT, HOST, () => {
      const address = server.address();
      const host = address.address === "::" ? "localhost" : address.address;
      console.log(`👤 User Service running on ${host}:${PORT}`);
      console.log(`📊 Metrics available at http://${host}:${PORT}/metrics`);
      console.log(
        `📊 Metrics available at http://${host}:${PORT}/metrics/user`
      );
      console.log(`🏥 Health check at http://${host}:${PORT}/health`);
      console.log(`🏥 Health check at http://${host}:${PORT}/health/user`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        console.log("HTTP server closed");

        try {
          await pool.end();
          console.log("Database connections closed");

          console.log("User service terminated");
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
    console.error("Failed to start User service:", error);
    process.exit(1);
  }
}

startServer();
