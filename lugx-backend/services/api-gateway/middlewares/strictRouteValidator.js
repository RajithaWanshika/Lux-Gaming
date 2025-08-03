const url = require("url");

function matchRoutePattern(pattern, actualPath) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = actualPath.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return false;

  for (let i = 0; i < patternParts.length; i++) {
    if (!patternParts[i].startsWith(":") && patternParts[i] !== pathParts[i]) {
      return false;
    }
  }
  return true;
}

const strictRouteValidator = (allowedRoutes) => (req, res, next) => {
  const parsedUrl = url.parse(req.url, true);
  const { method } = req;
  const pathname = parsedUrl.pathname;

  const matchedRoute = allowedRoutes.find(
    (route) =>
      route.method === method && matchRoutePattern(route.path, pathname)
  );

  if (!matchedRoute) {
    return res.status(403).json({
      error: "Route not allowed",
      method,
      path: pathname,
      code: "ROUTE_NOT_ALLOWED",
    });
  }

  const patternParts = matchedRoute.path.split("/").filter(Boolean);
  const paramCount = patternParts.filter((p) => p.startsWith(":")).length;

  if (paramCount !== matchedRoute.requiredParamsCount) {
    return res.status(400).json({
      error: "Incorrect number of path parameters",
      expected: matchedRoute.requiredParamsCount,
      received: paramCount,
      code: "INVALID_PATH_PARAMS",
    });
  }

  const queryKeys = Object.keys(parsedUrl.query);
  const allowedQuerySet = new Set(matchedRoute.allowedQueryParams || []);

  for (const key of queryKeys) {
    if (!allowedQuerySet.has(key)) {
      return res.status(400).json({
        error: `Query parameter '${key}' not allowed`,
        allowedParams: Array.from(allowedQuerySet),
        code: "INVALID_QUERY_PARAM",
      });
    }
  }

  req.matchedRoute = matchedRoute;
  next();
};

module.exports = strictRouteValidator;
