const express = require("express");
const router = express.Router();
const { body, query, param } = require("express-validator");
const {
  addUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  register,
  login,
} = require("../controllers/userController");
const authenticateToken = require("../middlewares/authenticateToken");

const registerValidation = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),

  body("email").isEmail().withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("first_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("First name must be less than 50 characters"),

  body("last_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Last name must be less than 50 characters"),
];

const updateValidation = [
  body("username")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),

  body("first_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("First name must be less than 50 characters"),

  body("last_name")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Last name must be less than 50 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value"),
];

const userQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),
];

const userByIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("User ID must be a positive integer"),
];

router.post("/register", registerValidation, register);
router.post("/login", login);

router.get("/", userQueryValidation, getUsers);
router.get("/:id", userByIdValidation, getUserById);
router.post("/", authenticateToken, registerValidation, addUser);
router.put(
  "/:id",
  [...userByIdValidation, ...updateValidation],
  authenticateToken,
  updateUser
);
router.delete("/:id", userByIdValidation, authenticateToken, deleteUser);

module.exports = router;
