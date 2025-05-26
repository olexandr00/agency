// backend/models/SiteOrder.js
const pool = require("../config/db");
const crypto = require("crypto");

async function generatePublicOrderId(connection) {
  let publicOrderId;
  let isUnique = false;
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const prefix = "ZAM"; // Ваш префікс

  while (!isUnique) {
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
    publicOrderId = `${prefix}-${currentYear}-${randomPart}`;
    const [rows] = await (connection || pool).query(
      "SELECT 1 FROM SiteOrders WHERE PublicOrderID = ?",
      [publicOrderId]
    );
    if (rows.length === 0) isUnique = true;
  }
  return publicOrderId;
}

const SiteOrder = {
  async create(userId, orderData, servicesInOrder) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const totalAmount = servicesInOrder.reduce(
        (sum, item) => sum + item.priceAtOrder * item.quantity,
        0
      );
      const publicOrderId = await generatePublicOrderId(connection);

      const siteOrderSql = `INSERT INTO SiteOrders 
                            (UserID, PublicOrderID, CustomerName, CustomerEmail, CustomerPhone, CustomerNotes, TotalAmount, OrderStatus) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const [orderResult] = await connection.query(siteOrderSql, [
        userId,
        publicOrderId,
        orderData.customerName,
        orderData.customerEmail,
        orderData.customerPhone,
        orderData.customerNotes || null,
        totalAmount,
        "new",
      ]);
      const internalOrderId = orderResult.insertId;

      if (servicesInOrder && servicesInOrder.length > 0) {
        const siteOrderServicesSql = `INSERT INTO SiteOrderServices (OrderID, ServiceID, Quantity, PriceAtOrder) VALUES ?`;
        const serviceValues = servicesInOrder.map((item) => [
          internalOrderId,
          item.serviceId,
          item.quantity,
          item.priceAtOrder,
        ]);
        await connection.query(siteOrderServicesSql, [serviceValues]);
      } else {
        await connection.rollback();
        connection.release();
        throw new Error("Cannot create an order with no services.");
      }

      await connection.commit();
      const createdOrder = await this.findById(publicOrderId);
      if (!createdOrder) {
        throw new Error(
          "Failed to retrieve the created order details immediately after creation."
        );
      }
      return createdOrder;
    } catch (error) {
      if (connection) {
        // Перевірка, чи було встановлено з'єднання перед відкатом/вивільненням
        try {
          await connection.rollback();
        } catch (rbError) {
          console.error("Error during rollback:", rbError);
        }
      }
      console.error("[SiteOrder.create MODEL] Error:", error);
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (
          error.message.includes("FK_SiteOrder_User") ||
          error.message.includes("UserID")
        )
          throw new Error(`User with ID ${userId} not found.`);
        if (
          error.message.includes("FK_OrderItem_Service") ||
          error.message.includes("ServiceID")
        )
          throw new Error(`One of the services in the order does not exist.`);
      }
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  async getAll({
    searchTerm = "",
    userIdFilter = null, // Фільтр по ID користувача (число)
    statusFilter = null,
  } = {}) {
    let sql = `
      SELECT 
        so.OrderID, so.PublicOrderID, so.UserID, u.Username AS UserUsername,
        so.OrderDate, so.OrderStatus, 
        so.CustomerName, so.CustomerEmail, so.CustomerPhone, so.CustomerNotes,
        so.TotalAmount
      FROM SiteOrders so
      JOIN Users u ON so.UserID = u.UserID
    `;
    const params = [];
    const whereClauses = [];

    if (userIdFilter !== null && !isNaN(parseInt(userIdFilter))) {
      // Перевіряємо, що userIdFilter - це число
      whereClauses.push("so.UserID = ?");
      params.push(parseInt(userIdFilter));
    }
    if (statusFilter) {
      whereClauses.push("so.OrderStatus = ?");
      params.push(statusFilter);
    }
    if (searchTerm) {
      // Пошук за ім'ям клієнта, email, username користувача АБО ПУБЛІЧНИМ НОМЕРОМ ЗАМОВЛЕННЯ
      whereClauses.push(
        `(so.CustomerName LIKE ? OR so.CustomerEmail LIKE ? OR u.Username LIKE ? OR so.PublicOrderID LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term); // Чотири плейсхолдери для LIKE
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY so.OrderDate DESC";

    console.log("[SiteOrder.getAll] SQL:", sql, "Params:", params); // Логування для відладки
    const [orders] = await pool.query(sql, params);
    return orders;
  },

  async findById(identifier) {
    // ... (код findById залишається без змін від попередньої версії, він вже гнучкий)
    let orderSql;
    let queryParam = identifier;
    const idIsNumeric =
      !isNaN(parseInt(identifier)) &&
      String(parseInt(identifier)) === String(identifier);
    const idStartsWithPrefix = String(identifier).startsWith("ZAM-"); // Або ваш префікс

    if (idStartsWithPrefix) {
      orderSql = `SELECT so.*, u.Username AS UserUsername, u.Email AS UserEmail FROM SiteOrders so JOIN Users u ON so.UserID = u.UserID WHERE so.PublicOrderID = ?`;
    } else if (idIsNumeric) {
      orderSql = `SELECT so.*, u.Username AS UserUsername, u.Email AS UserEmail FROM SiteOrders so JOIN Users u ON so.UserID = u.UserID WHERE so.OrderID = ?`;
      queryParam = parseInt(identifier);
    } else {
      console.warn(
        `[SiteOrder.findById] Identifier '${identifier}' is not numeric and does not start with prefix. Assuming it might be a PublicOrderID without prefix or an error.`
      );
      orderSql = `SELECT so.*, u.Username AS UserUsername, u.Email AS UserEmail FROM SiteOrders so JOIN Users u ON so.UserID = u.UserID WHERE so.PublicOrderID = ?`;
    }

    const [orderRows] = await pool.query(orderSql, [queryParam]);
    if (orderRows.length === 0) return null;
    const order = orderRows[0];

    const servicesSql = `SELECT sos.*, s.ServiceName, s.ServiceDescription FROM SiteOrderServices sos JOIN Services s ON sos.ServiceID = s.ServiceID WHERE sos.OrderID = ?`;
    const [services] = await pool.query(servicesSql, [order.OrderID]);
    order.services = services;
    return order;
  },

  async updateStatus(orderId, newStatus) {
    // orderId тут - це внутрішній ID
    const validStatuses = ["new", "processing", "completed", "cancelled"];
    if (!validStatuses.includes(newStatus))
      throw new Error(
        `Invalid order status: ${newStatus}. Must be one of: ${validStatuses.join(
          ", "
        )}`
      );
    const sql = "UPDATE SiteOrders SET OrderStatus = ? WHERE OrderID = ?";
    const [result] = await pool.query(sql, [newStatus, orderId]);
    return result.affectedRows > 0;
  },

  async delete(orderId) {
    // orderId тут - це внутрішній ID
    const sql = "DELETE FROM SiteOrders WHERE OrderID = ?";
    const [result] = await pool.query(sql, [orderId]);
    return result.affectedRows > 0;
  },
};
module.exports = SiteOrder;
