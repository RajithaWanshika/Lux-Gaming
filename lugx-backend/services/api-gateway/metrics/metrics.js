const client = require("prom-client");

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const gatewayRequestsTotal = new client.Counter({
  name: "gateway_requests_total",
  help: "Total number of requests handled by the API Gateway",
  labelNames: ["method", "route", "status_code"],
});
register.registerMetric(gatewayRequestsTotal);

module.exports = {
  register,
  gatewayRequestsTotal,
};
