const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const {
  trackEvent,
  trackPageView,
  trackGameInteraction,
  getDashboard,
  getRealTimeAnalytics,
} = require("../controllers/analyticsController");
const {
  simulateRealtimeData,
  simulateHistoricalData,
  clearAnalyticsData,
} = require("../controllers/simulationController");

const eventValidation = [
  body("event_type").notEmpty().withMessage("Event type is required"),

  body("event_category").notEmpty().withMessage("Event category is required"),

  body("event_action").notEmpty().withMessage("Event action is required"),

  body("page_url").isURL().withMessage("Valid page URL is required"),

  body("session_id").notEmpty().withMessage("Session ID is required"),

  body("event_value")
    .optional()
    .isNumeric()
    .withMessage("Event value must be numeric"),
];

const pageViewValidation = [
  body("page_url").isURL().withMessage("Valid page URL is required"),

  body("page_title").notEmpty().withMessage("Page title is required"),

  body("session_id").notEmpty().withMessage("Session ID is required"),

  body("time_on_page")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Time on page must be a positive integer"),

  body("scroll_depth")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Scroll depth must be between 0 and 100"),
];

const gameInteractionValidation = [
  body("game_id").isInt({ min: 1 }).withMessage("Valid game ID is required"),

  body("game_title").notEmpty().withMessage("Game title is required"),

  body("interaction_type")
    .isIn(["view", "wishlist_add", "cart_add", "purchase", "download"])
    .withMessage("Invalid interaction type"),

  body("session_id").notEmpty().withMessage("Session ID is required"),

  body("duration_seconds")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Duration must be a positive integer"),
];

const dashboardValidation = [
  query("period")
    .optional()
    .isIn(["1d", "7d", "30d", "90d"])
    .withMessage("Period must be one of: 1d, 7d, 30d, 90d"),

  query("timezone")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Invalid timezone format"),
];

const simulationValidation = [
  query("sessions")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Sessions must be between 1 and 50"),

  query("duration")
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage("Duration must be between 1 and 120 minutes"),

  query("days")
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage("Days must be between 1 and 30"),

  query("sessions_per_day")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("Sessions per day must be between 1 and 200"),
];

router.post("/events", eventValidation, trackEvent);
router.post("/pageviews", pageViewValidation, trackPageView);
router.post(
  "/game-interactions",
  gameInteractionValidation,
  trackGameInteraction
);

router.get("/dashboard", dashboardValidation, getDashboard);
router.get("/realtime", getRealTimeAnalytics);

router.post("/simulate/realtime", simulationValidation, simulateRealtimeData);
router.post(
  "/simulate/historical",
  simulationValidation,
  simulateHistoricalData
);
router.delete("/clear", clearAnalyticsData);

module.exports = router;
