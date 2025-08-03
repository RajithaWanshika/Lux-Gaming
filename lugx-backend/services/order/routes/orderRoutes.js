const express = require("express");
const router = express.Router();
const { body, query, param } = require("express-validator");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  getOrderStatus,
} = require("../controllers/orderController");

const createOrderValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be a non-empty array"),

  body("items.*.game_id")
    .isInt({ min: 1 })
    .withMessage("Each item must have a valid game_id"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Each item must have a valid quantity"),

  body("items.*.unit_price")
    .isFloat({ min: 0 })
    .withMessage("Each item must have a valid unit_price"),
];

const updateOrderValidation = [
  body("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .withMessage("Invalid order status"),
];

const orderQueryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .withMessage("Invalid order status"),
];

const orderByIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Order ID must be a positive integer"),
];

router.post("/", createOrderValidation, createOrder);
router.get("/", orderQueryValidation, getOrders);
router.get("/:id", orderByIdValidation, getOrderById);
router.put(
  "/:id",
  [...orderByIdValidation, ...updateOrderValidation],
  updateOrder
);
router.delete("/:id", orderByIdValidation, cancelOrder);
router.post("/:id/cancel", orderByIdValidation, cancelOrder);
router.get("/:id/status", orderByIdValidation, getOrderStatus);

module.exports = router;
