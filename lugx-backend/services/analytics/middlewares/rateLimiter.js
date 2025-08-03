const rateLimit = require("express-rate-limit");

const eventTrackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many analytics events, please reduce tracking frequency",
    code: "EVENT_TRACKING_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers["x-session-id"] || req.user?.id || req.ip;
  },
});

const pageViewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: {
    error: "Too many page view events, please slow down",
    code: "PAGE_VIEW_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers["x-session-id"] || req.user?.id || req.ip;
  },
});

const gameInteractionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: {
    error: "Too many game interaction events, please reduce frequency",
    code: "GAME_INTERACTION_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers["x-session-id"] || req.user?.id || req.ip;
  },
});

const dashboardQueryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: {
    error:
      "Too many dashboard queries, please wait before requesting more data",
    code: "DASHBOARD_QUERY_RATE_LIMIT_EXCEEDED",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const realtimeAnalyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: {
    error:
      "Too many real-time analytics requests, please reduce polling frequency",
    code: "REALTIME_ANALYTICS_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const customReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "Too many custom report requests, please wait before generating another report",
    code: "CUSTOM_REPORT_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const adminAnalyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: "Admin rate limit exceeded for analytics operations",
    code: "ADMIN_ANALYTICS_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const bulkExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Too many bulk export requests, please wait before requesting another export",
    code: "BULK_EXPORT_RATE_LIMIT_EXCEEDED",
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const analyticsOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: "Too many analytics requests, please slow down",
    code: "ANALYTICS_OPERATIONS_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const createAnalyticsRateLimiter = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  if (path === "/events" && method === "POST") {
    return eventTrackingLimiter(req, res, next);
  }

  if (path === "/pageviews" && method === "POST") {
    return pageViewLimiter(req, res, next);
  }

  if (path === "/game-interactions" && method === "POST") {
    return gameInteractionLimiter(req, res, next);
  }

  if (path === "/dashboard" && method === "GET") {
    return dashboardQueryLimiter(req, res, next);
  }

  if (path === "/realtime" && method === "GET") {
    return realtimeAnalyticsLimiter(req, res, next);
  }

  if (path.includes("/reports") && method === "POST") {
    return customReportLimiter(req, res, next);
  }

  if (path.includes("/export") && method === "GET") {
    return bulkExportLimiter(req, res, next);
  }

  return analyticsOperationsLimiter(req, res, next);
};

module.exports = {
  eventTrackingLimiter,
  pageViewLimiter,
  gameInteractionLimiter,
  dashboardQueryLimiter,
  realtimeAnalyticsLimiter,
  customReportLimiter,
  adminAnalyticsLimiter,
  bulkExportLimiter,
  analyticsOperationsLimiter,
  createAnalyticsRateLimiter,
};
