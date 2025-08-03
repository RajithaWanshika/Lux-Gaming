const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

let testOrders = [
  {
    id: 1,
    user_id: 1,
    status: "completed",
    total: 84.98,
    total_items: 2,
    created_at: new Date("2024-01-01"),
    items: [
      {
        id: 1,
        order_id: 1,
        game_id: 1,
        quantity: 1,
        unit_price: 24.99,
        total_price: 24.99,
      },
      {
        id: 2,
        order_id: 1,
        game_id: 2,
        quantity: 1,
        unit_price: 59.99,
        total_price: 59.99,
      },
    ],
  },
  {
    id: 2,
    user_id: 2,
    status: "pending",
    total: 59.99,
    total_items: 1,
    created_at: new Date("2024-01-02"),
    items: [
      {
        id: 3,
        order_id: 2,
        game_id: 1,
        quantity: 1,
        unit_price: 59.99,
        total_price: 59.99,
      },
    ],
  },
];

const app = express();
app.use(express.json());

const testAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, "test-secret");
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(403).json({ error: "TOKEN_INVALID" });
    }
  } else {
    return res.status(401).json({ error: "TOKEN_MISSING" });
  }
};

let requestCounts = {
  creation: 0,
  browsing: 0,
  cancellation: 0,
};

const testRateLimiters = {
  creation: (req, res, next) => {
    requestCounts.creation++;
    if (requestCounts.creation > 3) {
      return res.status(429).json({
        error:
          "Too many orders created, please wait before placing another order",
        code: "ORDER_CREATION_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
  browsing: (req, res, next) => {
    requestCounts.browsing++;
    if (requestCounts.browsing > 30) {
      return res.status(429).json({
        error: "Too many order requests, please slow down",
        code: "ORDER_BROWSING_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
  cancellation: (req, res, next) => {
    requestCounts.cancellation++;
    if (requestCounts.cancellation > 5) {
      return res.status(429).json({
        error: "Too many order cancellations, please contact support",
        code: "ORDER_CANCELLATION_RATE_LIMIT_EXCEEDED",
      });
    }
    next();
  },
};

app.post("/orders", testAuth, testRateLimiters.creation, (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items are required" });
  }

  for (const item of items) {
    if (!item.game_id || !item.quantity || !item.unit_price) {
      return res.status(400).json({
        error: "Each item must have game_id, quantity, and unit_price",
      });
    }
  }

  let total = 0;
  const processedItems = items.map((item) => {
    const itemTotal = parseFloat(item.unit_price) * item.quantity;
    total += itemTotal;
    return {
      game_id: item.game_id,
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      total_price: itemTotal,
    };
  });

  const newOrder = {
    id: testOrders.length + 1,
    user_id: userId,
    status: "pending",
    total,
    total_items: processedItems.length,
    created_at: new Date(),
    items: processedItems,
  };

  testOrders.push(newOrder);

  res.status(201).json({
    message: "Order created successfully",
    order: newOrder,
  });
});

app.get("/orders", testAuth, testRateLimiters.browsing, (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  let userOrders = testOrders.filter((order) => order.user_id === userId);

  if (status) {
    userOrders = userOrders.filter((order) => order.status === status);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedOrders = userOrders.slice(startIndex, endIndex);

  res.json({
    orders: paginatedOrders,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(userOrders.length / limit),
      totalOrders: userOrders.length,
      hasNextPage: page < Math.ceil(userOrders.length / limit),
      hasPrevPage: page > 1,
    },
    filters: { status },
  });
});

app.get("/orders/:id", testAuth, testRateLimiters.browsing, (req, res) => {
  const userId = req.user.id;
  const orderId = parseInt(req.params.id);

  const order = testOrders.find(
    (o) => o.id === orderId && o.user_id === userId
  );

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(order);
});

app.put("/orders/:id", testAuth, (req, res) => {
  const userId = req.user.id;
  const orderId = parseInt(req.params.id);
  const { status } = req.body;

  const orderIndex = testOrders.findIndex(
    (o) => o.id === orderId && o.user_id === userId
  );

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const validStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      error: "Invalid status",
      validStatuses,
    });
  }

  if (status) {
    testOrders[orderIndex].status = status;
  }

  res.json({
    message: "Order updated successfully",
    order: testOrders[orderIndex],
  });
});

app.delete(
  "/orders/:id",
  testAuth,
  testRateLimiters.cancellation,
  (req, res) => {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);

    const orderIndex = testOrders.findIndex(
      (o) => o.id === orderId && o.user_id === userId
    );

    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = testOrders[orderIndex];
    const cancellableStatuses = ["pending", "confirmed"];

    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: "Order cannot be cancelled in current status",
        currentStatus: order.status,
        cancellableStatuses,
      });
    }

    testOrders[orderIndex].status = "cancelled";

    res.json({
      message: "Order cancelled successfully",
      order: testOrders[orderIndex],
    });
  }
);

app.get("/orders/:id/status", testAuth, (req, res) => {
  const userId = req.user.id;
  const orderId = parseInt(req.params.id);

  const order = testOrders.find(
    (o) => o.id === orderId && o.user_id === userId
  );

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json({
    id: order.id,
    status: order.status,
    total: order.total,
    total_items: order.total_items,
    created_at: order.created_at,
  });
});

describe("Order Service API", () => {
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign({ id: 1, username: "testuser" }, "test-secret");
  });

  beforeEach(() => {
    requestCounts = {
      creation: 0,
      browsing: 0,
      cancellation: 0,
    };

    testOrders = [
      {
        id: 1,
        user_id: 1,
        status: "completed",
        total: 84.98,
        total_items: 2,
        created_at: new Date("2024-01-01"),
        items: [
          {
            id: 1,
            order_id: 1,
            game_id: 1,
            quantity: 1,
            unit_price: 24.99,
            total_price: 24.99,
          },
          {
            id: 2,
            order_id: 1,
            game_id: 2,
            quantity: 1,
            unit_price: 59.99,
            total_price: 59.99,
          },
        ],
      },
      {
        id: 2,
        user_id: 2,
        status: "pending",
        total: 59.99,
        total_items: 1,
        created_at: new Date("2024-01-02"),
        items: [
          {
            id: 3,
            order_id: 2,
            game_id: 1,
            quantity: 1,
            unit_price: 59.99,
            total_price: 59.99,
          },
        ],
      },
    ];
  });

  describe("POST /orders", () => {
    it("should create a new order successfully", async () => {
      const newOrder = {
        items: [
          {
            game_id: 1,
            quantity: 2,
            unit_price: 29.99,
          },
        ],
      };

      const response = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newOrder);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Order created successfully");
      expect(response.body.order).toHaveProperty("id");
      expect(response.body.order).toHaveProperty("status", "pending");
      expect(response.body.order).toHaveProperty("total", 59.98);
      expect(response.body.order).toHaveProperty("total_items", 1);
    });

    it("should reject order without items", async () => {
      const response = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Items are required");
    });

    it("should enforce rate limiting", async () => {
      const orderData = {
        items: [{ game_id: 1, quantity: 1, unit_price: 10 }],
      };

      for (let i = 0; i < 4; i++) {
        await request(app)
          .post("/orders")
          .set("Authorization", `Bearer ${authToken}`)
          .send(orderData);
      }

      const response = await request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(429);
      expect(response.body.code).toBe("ORDER_CREATION_RATE_LIMIT_EXCEEDED");
    });
  });

  describe("GET /orders", () => {
    it("should return user orders", async () => {
      const response = await request(app)
        .get("/orders")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0]).toHaveProperty("user_id", 1);
    });

    it("should filter orders by status", async () => {
      const response = await request(app)
        .get("/orders?status=completed")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].status).toBe("completed");
    });
  });

  describe("GET /orders/:id", () => {
    it("should return specific order", async () => {
      const response = await request(app)
        .get("/orders/1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("items");
    });

    it("should return 404 for non-existent order", async () => {
      const response = await request(app)
        .get("/orders/999")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Order not found");
    });
  });

  describe("PUT /orders/:id", () => {
    it("should update order status", async () => {
      const response = await request(app)
        .put("/orders/1")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "shipped" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Order updated successfully");
      expect(response.body.order.status).toBe("shipped");
    });
  });

  describe("DELETE /orders/:id", () => {
    it("should cancel order", async () => {
      testOrders[0].status = "pending";

      const response = await request(app)
        .delete("/orders/1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Order cancelled successfully");
      expect(response.body.order.status).toBe("cancelled");
    });
  });

  describe("Authentication", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/orders");
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("TOKEN_MISSING");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/orders")
        .set("Authorization", "Bearer invalid-token");
      expect(response.status).toBe(403);
      expect(response.body.error).toBe("TOKEN_INVALID");
    });
  });
});

module.exports = app;
