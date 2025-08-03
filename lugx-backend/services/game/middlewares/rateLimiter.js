const rateLimit = require("express-rate-limit");

const gameSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    error: "Client error: Too many search requests",
    code: "GAME_SEARCH_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const gameBrowsingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    error: "Client error: Too many game browsing requests",
    code: "GAME_BROWSING_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const gameCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    error: "Client error: Too many games created",
    code: "GAME_CREATION_RATE_LIMIT_EXCEEDED",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const gameUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: {
    error: "Client error: Too many game updates",
    code: "GAME_UPDATE_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const reviewSubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    error: "Client error: Too many reviews submitted",
    code: "REVIEW_SUBMISSION_RATE_LIMIT_EXCEEDED",
    retryAfter: 600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const gameOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: "Client error: Too many game requests",
    code: "GAME_OPERATIONS_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

const createGameRateLimiter = (req, res, next) => {
  const path = req.path;
  const method = req.method;
  const hasSearchQuery = req.query.search || req.query.q;

  if (method === "GET" && hasSearchQuery) {
    return gameSearchLimiter(req, res, next);
  }

  if (method === "POST" && path === "/") {
    return gameCreationLimiter(req, res, next);
  }

  if (method === "PUT" || method === "PATCH") {
    return gameUpdateLimiter(req, res, next);
  }

  if (path.includes("/reviews") && method === "POST") {
    return reviewSubmissionLimiter(req, res, next);
  }

  if (method === "GET") {
    return gameBrowsingLimiter(req, res, next);
  }

  return gameOperationsLimiter(req, res, next);
};

module.exports = {
  gameSearchLimiter,
  gameBrowsingLimiter,
  gameCreationLimiter,
  gameUpdateLimiter,
  reviewSubmissionLimiter,
  gameOperationsLimiter,
  createGameRateLimiter,
};
