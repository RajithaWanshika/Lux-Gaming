const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many authentication attempts",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = (req, res, next) => {
  const path = req.path;

  if (path.includes("/auth/login") || path.includes("/auth/register")) {
    return authLimiter(req, res, next);
  }

  return generalLimiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
};
