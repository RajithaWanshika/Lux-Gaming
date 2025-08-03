const promClient = require("prom-client");

const register = new promClient.Registry();

const eventsProcessed = new promClient.Counter({
  name: "analytics_events_processed_total",
  help: "Total number of analytics events processed",
  labelNames: ["event_type"],
});

const reportGenerations = new promClient.Counter({
  name: "analytics_report_generations_total",
  help: "Total number of analytics reports generated",
  labelNames: ["report_type"],
});

const httpRequestDuration = new promClient.Histogram({
  name: "analytics_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "endpoint", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "analytics_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status_code"],
});

const databaseOperationDuration = new promClient.Histogram({
  name: "analytics_db_operation_duration_seconds",
  help: "Time taken for database operations",
  labelNames: ["operation"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

register.registerMetric(eventsProcessed);
register.registerMetric(reportGenerations);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseOperationDuration);

const trackHttpRequest = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const endpoint = req.route ? req.route.path : req.path;
    httpRequestDuration.labels(req.method, endpoint, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, endpoint, res.statusCode).inc();
  });
  next();
};

module.exports = {
  register,
  eventsProcessed,
  reportGenerations,
  httpRequestDuration,
  httpRequestTotal,
  databaseOperationDuration,
  trackHttpRequest,
}; 