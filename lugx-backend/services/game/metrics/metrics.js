const promClient = require("prom-client");

const register = new promClient.Registry();

const gameCreations = new promClient.Counter({
  name: "game_creations_total",
  help: "Total number of games created",
  labelNames: ["category"],
});

const gameViews = new promClient.Counter({
  name: "game_views_total",
  help: "Total number of game views",
  labelNames: ["id", "category"],
});

const gameSearches = new promClient.Counter({
  name: "game_searches_total",
  help: "Total number of game searches",
  labelNames: ["search_term", "category", "sort"],
});

const gamePriceDistribution = new promClient.Histogram({
  name: "game_price_distribution",
  help: "Distribution of game prices",
  labelNames: ["category"],
  buckets: [0, 10, 25, 50, 100, 200, 500],
});

const httpRequestDuration = new promClient.Histogram({
  name: "game_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "endpoint", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: "game_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status_code"],
});

const databaseOperationDuration = new promClient.Histogram({
  name: "game_db_operation_duration_seconds",
  help: "Time taken for database operations",
  labelNames: ["operation"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const totalGames = new promClient.Gauge({
  name: "games_total",
  help: "Total number of games in catalog",
  labelNames: ["category"],
});

const reviewsTotal = new promClient.Gauge({
  name: "reviews_total",
  help: "Total number of reviews",
  labelNames: ["game_id"],
});

register.registerMetric(gameCreations);
register.registerMetric(gameViews);
register.registerMetric(gameSearches);
register.registerMetric(gamePriceDistribution);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseOperationDuration);
register.registerMetric(totalGames);
register.registerMetric(reviewsTotal);

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
  gameCreations,
  gameViews,
  gameSearches,
  gamePriceDistribution,
  httpRequestDuration,
  httpRequestTotal,
  databaseOperationDuration,
  totalGames,
  reviewsTotal,
  trackHttpRequest,
};
