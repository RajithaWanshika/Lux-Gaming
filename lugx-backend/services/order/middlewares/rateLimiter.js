const rateLimit = require("express-rate-limit");

const orderCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    error: "Too many orders created, please wait before placing another order",
    code: "ORDER_CREATION_RATE_LIMIT_EXCEEDED",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const orderCancellationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many order cancellations.",
    code: "ORDER_CANCELLATION_RATE_LIMIT_EXCEEDED",
    retryAfter: 600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const orderUpdateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many order updates.",
    code: "ORDER_UPDATE_RATE_LIMIT_EXCEEDED",
    retryAfter: 120,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const orderBrowsingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many order requests.",
    code: "ORDER_BROWSING_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const orderStatusLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: {
    error: "Too many status checks.",
    code: "ORDER_STATUS_RATE_LIMIT_EXCEEDED",
    retryAfter: 30,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const adminOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: "Admin rate limit exceeded for order operations",
    code: "ADMIN_ORDER_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const orderOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many order requests.",
    code: "ORDER_OPERATIONS_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const createOrderRateLimiter = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  if (method === "POST" && path === "/") {
    return orderCreationLimiter(req, res, next);
  }

  if (path.includes("/cancel") && method === "POST") {
    return orderCancellationLimiter(req, res, next);
  }

  if (method === "PUT" || method === "PATCH") {
    return orderUpdateLimiter(req, res, next);
  }

  if (path.includes("/status") && method === "GET") {
    return orderStatusLimiter(req, res, next);
  }

  if (method === "GET") {
    return orderBrowsingLimiter(req, res, next);
  }

  return orderOperationsLimiter(req, res, next);
};

module.exports = {
  orderCreationLimiter,
  orderCancellationLimiter,
  orderUpdateLimiter,
  orderBrowsingLimiter,
  orderStatusLimiter,
  adminOrderLimiter,
  orderOperationsLimiter,
  createOrderRateLimiter,
};
