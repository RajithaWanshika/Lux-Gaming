const pool = require("../db/pool");
const {
  orderCreations,
  orderUpdates,
  orderCancellations,
} = require("../metrics/metrics");
const { validationResult } = require("express-validator");

const trim = (value) => {
  return value ? value.trim() : "";
};

const requestValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({ error: "Validation failed", details: errors.array() });
    return false;
  }
  return true;
};

exports.createOrder = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    let total = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.game_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error: "Each item must have a valid game_id and quantity",
        });
      }

      if (!item.unit_price) {
        return res.status(400).json({
          error: "Each item must have a valid unit_price",
        });
      }

      const itemTotal = parseFloat(item.unit_price) * item.quantity;
      total += itemTotal;

      processedItems.push({
        game_id: item.game_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: itemTotal,
      });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, status, total, total_items) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, "pending", total, processedItems.length]
    );

    const order = orderResult.rows[0];

    for (const item of processedItems) {
      await pool.query(
        `INSERT INTO order_items (
          order_id, game_id, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          item.game_id,
          item.quantity,
          item.unit_price,
          item.total_price,
        ]
      );
    }

    if (orderCreations?.inc) {
      orderCreations.inc({ status: "pending" });
    }

    res.status(201).json({
      message: "Order created successfully",
      order: {
        ...order,
        items: processedItems,
      },
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const page = parseInt(trim(req.query.page)) || 1;
    const limit = parseInt(trim(req.query.limit)) || 10;
    const status = trim(req.query.status) || "";
    const offset = (page - 1) * limit;

    let whereConditions = ["user_id = $1"];
    let queryParams = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const ordersQuery = `
      SELECT id, user_id, status, total, total_items, created_at, updated_at
      FROM orders 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;

    queryParams.push(limit, offset);

    const [ordersResult, countResult] = await Promise.all([
      pool.query(ordersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await pool.query(
          "SELECT * FROM order_items WHERE order_id = $1",
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows,
        };
      })
    );

    res.json({
      orders: ordersWithItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        status,
      },
    });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE id = $1 AND user_id = $2",
      [trim(id), userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [order.id]
    );

    res.json({
      ...order,
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("Get order by ID error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    if (!requestValidation(req, res)) return;

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const orderExists = await pool.query(
      "SELECT id, status FROM orders WHERE id = $1 AND user_id = $2",
      [trim(id), userId]
    );

    if (orderExists.rows.length === 0) {
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

    const result = await pool.query(
      `UPDATE orders 
       SET status = COALESCE($1, status)
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [status, id, userId]
    );

    if (orderUpdates?.inc) {
      orderUpdates.inc({ status: status || orderExists.rows[0].status });
    }

    res.json({
      message: "Order updated successfully",
      order: result.rows[0],
    });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const orderResult = await pool.query(
      "SELECT id, status FROM orders WHERE id = $1 AND user_id = $2",
      [trim(id), userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];
    const cancellableStatuses = ["pending", "confirmed"];

    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: "Order cannot be cancelled in current status",
        currentStatus: order.status,
        cancellableStatuses,
      });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (orderCancellations?.inc) {
      orderCancellations.inc({ previous_status: order.status });
    }

    res.json({
      message: "Order cancelled successfully",
      order: result.rows[0],
    });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User ID missing in token" });
    }

    const result = await pool.query(
      "SELECT id, status, total, total_items, created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2",
      [trim(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get order status error:", err);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
};
