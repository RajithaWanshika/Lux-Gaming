const express = require("express");
const router = express.Router();
const { body, query, param } = require("express-validator");
const {
  addGame,
  addGameMultiBatch,
  getGames,
  getGameById,
  updateGame,
  deleteGame,
  getCategories,
} = require("../controllers/gameController");

const gameValidation = [
  body("title")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),

  body("price")
    .isNumeric()
    .withMessage("Price must be a valid number")
    .isFloat({ min: 0 })
    .withMessage("Price must be 0 or greater"),

  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),

  body("category")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("image_url")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Image URL must be less than 500 characters"),

  body("release_date")
    .optional()
    .isDate()
    .withMessage("Release date must be a valid date"),
];

const updateGameValidation = [
  body("title")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a valid number")
    .isFloat({ min: 0 })
    .withMessage("Price must be 0 or greater"),

  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),

  body("category")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("image_url")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Image URL must be less than 500 characters"),

  body("release_date")
    .optional()
    .isDate()
    .withMessage("Release date must be a valid date"),
];

const batchGameValidation = [
  body()
    .isArray({ min: 1 })
    .withMessage("Request body must be a non-empty array"),

  body("*.title")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("*.description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),

  body("*.price")
    .isNumeric()
    .withMessage("Price must be a valid number")
    .isFloat({ min: 0 })
    .withMessage("Price must be 0 or greater"),

  body("*.discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100"),

  body("*.category")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("*.image_url")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Image URL must be less than 500 characters"),

  body("*.release_date")
    .optional()
    .isDate()
    .withMessage("Release date must be a valid date"),
];

const gameQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("sort")
    .optional()
    .isIn(["title", "price", "newest", "oldest"])
    .withMessage("Sort must be one of: title, price, newest, oldest"),
];

const gameByIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Game ID must be a positive integer"),

  query("with_review")
    .optional()
    .isBoolean()
    .withMessage("with_review must be a boolean value"),
];

router.get("/", gameQueryValidation, getGames);
router.get("/categories", getCategories);
router.get("/:id", gameByIdValidation, getGameById);
router.post("/", gameValidation, addGame);
router.post("/batch", batchGameValidation, addGameMultiBatch);
router.put("/:id", updateGameValidation, updateGame);
router.delete("/:id", deleteGame);

module.exports = router;
