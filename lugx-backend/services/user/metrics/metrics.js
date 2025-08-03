const promClient = require("prom-client");

const register = new promClient.Registry();

const userCreations = new promClient.Counter({
  name: "user_creations_total",
  help: "Total number of users created",
});

const userLogins = new promClient.Counter({
  name: "user_logins_total",
  help: "Total number of successful user logins",
});

const activeUsers = new promClient.Gauge({
  name: "active_users_current",
  help: "Current number of active users",
});

const totalUsers = new promClient.Gauge({
  name: "total_users_current",
  help: "Current total number of users",
});

const httpRequestDuration = new promClient.Histogram({
  name: "user_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "endpoint", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "user_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status_code"],
});

const databaseOperationDuration = new promClient.Histogram({
  name: "user_db_operation_duration_seconds",
  help: "Time taken for database operations",
  labelNames: ["operation"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

register.registerMetric(userCreations);
register.registerMetric(userLogins);
register.registerMetric(activeUsers);
register.registerMetric(totalUsers);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseOperationDuration);

const trackHttpRequest = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const endpoint = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, endpoint, res.statusCode)
      .observe(duration);

    httpRequestTotal.labels(req.method, endpoint, res.statusCode).inc();
  });

  next();
};

module.exports = {
  register,
  userCreations,
  userLogins,
  activeUsers,
  totalUsers,
  httpRequestDuration,
  httpRequestTotal,
  databaseOperationDuration,
  trackHttpRequest,
};
