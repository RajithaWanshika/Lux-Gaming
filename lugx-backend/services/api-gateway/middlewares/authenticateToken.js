const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access token required",
      code: "TOKEN_MISSING",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification failed:", err.message);

      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      }

      if (err.name === "JsonWebTokenError") {
        return res.status(403).json({
          error: "Invalid token",
          code: "TOKEN_INVALID",
        });
      }

      return res.status(403).json({
        error: "Token verification failed",
        code: "TOKEN_VERIFICATION_FAILED",
      });
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
