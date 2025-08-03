const promClient = require("prom-client");

const register = new promClient.Registry();

const orderCreations = new promClient.Counter({
  name: "order_creations_total",
  help: "Total number of orders created",
  labelNames: ["status"],
});

const orderUpdates = new promClient.Counter({
  name: "order_updates_total",
  help: "Total number of order updates",
  labelNames: ["status"],
});

const orderCancellations = new promClient.Counter({
  name: "order_cancellations_total",
  help: "Total number of order cancellations",
  labelNames: ["previous_status"],
});

const orderStatusDistribution = new promClient.Gauge({
  name: "orders_by_status_current",
  help: "Current number of orders by status",
  labelNames: ["status"],
});

const orderValueDistribution = new promClient.Histogram({
  name: "order_value_distribution",
  help: "Distribution of order values",
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

const orderItemsPerOrder = new promClient.Histogram({
  name: "order_items_per_order_distribution",
  help: "Distribution of number of items per order",
  buckets: [1, 2, 3, 5, 10, 20],
});

const totalRevenue = new promClient.Gauge({
  name: "total_revenue_current",
  help: "Current total revenue",
});

const httpRequestDuration = new promClient.Histogram({
  name: "order_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "endpoint", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "order_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status_code"],
});

const databaseOperationDuration = new promClient.Histogram({
  name: "order_db_operation_duration_seconds",
  help: "Time taken for database operations",
  labelNames: ["operation"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const totalOrders = new promClient.Gauge({
  name: "total_orders_current",
  help: "Current total number of orders",
  labelNames: ["status"],
});

register.registerMetric(orderCreations);
register.registerMetric(orderUpdates);
register.registerMetric(orderCancellations);
register.registerMetric(orderStatusDistribution);
register.registerMetric(orderValueDistribution);
register.registerMetric(orderItemsPerOrder);
register.registerMetric(totalRevenue);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseOperationDuration);
register.registerMetric(totalOrders);

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
  orderCreations,
  orderUpdates,
  orderCancellations,
  orderStatusDistribution,
  orderValueDistribution,
  orderItemsPerOrder,
  totalRevenue,
  httpRequestDuration,
  httpRequestTotal,
  databaseOperationDuration,
  totalOrders,
  trackHttpRequest,
};
