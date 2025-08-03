const rateLimit = require("express-rate-limit");

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many accounts created from this IP",
    code: "REGISTRATION_RATE_LIMIT_EXCEEDED",
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many login attempts, please try again later",
    code: "LOGIN_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.body?.email || "unknown"}_${req.ip}`;
  },
});

const profileUpdateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many profile updates, please wait before updating again",
    code: "PROFILE_UPDATE_RATE_LIMIT_EXCEEDED",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: "Too many password reset requests, please try again later",
    code: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
});

const userOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: "Too many requests, please slow down",
    code: "USER_OPERATIONS_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const createUserRateLimiter = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  if (path === "/register" && method === "POST") {
    return registrationLimiter(req, res, next);
  }

  if (path === "/login" && method === "POST") {
    return loginLimiter(req, res, next);
  }

  if (path.includes("/password-reset") && method === "POST") {
    return passwordResetLimiter(req, res, next);
  }

  if ((path.includes("/profile") || method === "PUT") && req.user) {
    return profileUpdateLimiter(req, res, next);
  }

  return userOperationsLimiter(req, res, next);
};

module.exports = {
  registrationLimiter,
  loginLimiter,
  profileUpdateLimiter,
  passwordResetLimiter,
  userOperationsLimiter,
  createUserRateLimiter,
};
