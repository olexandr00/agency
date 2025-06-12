// backend/models/SiteOrder.js
const pool = require("../config/db");
const crypto = require("crypto");

async function generatePublicOrderId(connection) {
  let publicOrderId;
  let isUnique = false;
  const currentYear = new Date().getFullYear().toString().slice(-2); // Останні 2 цифри року
  const prefix = "ZAM"; // Префікс

  while (!isUnique) {
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 випадкових символів
    publicOrderId = `${prefix}-${currentYear}-${randomPart}`;
    const [rows] = await (connection || pool).query(
      // Використовуємо передане з'єднання або пул
      "SELECT 1 FROM SiteOrders WHERE PublicOrderID = ? LIMIT 1",
      [publicOrderId]
    );
    if (rows.length === 0) isUnique = true;
  }
  return publicOrderId;
}

const SiteOrder = {
  async create(userId, orderData, servicesInOrder) {
    // userId може бути null, якщо замовлення від неавтентифікованого користувача
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Перевірка існування користувача, якщо userId передано
      if (userId !== null && userId !== undefined) {
        const [userRows] = await connection.query(
          "SELECT 1 FROM Users WHERE UserID = ? LIMIT 1",
          [userId]
        );
        if (userRows.length === 0) {
          throw new Error(`Користувача з ID ${userId} не знайдено.`);
        }
      }

      if (!servicesInOrder || servicesInOrder.length === 0) {
        throw new Error("Неможливо створити замовлення без послуг.");
      }

      // Перевірка існування всіх послуг в замовленні
      for (const item of servicesInOrder) {
        const [serviceRows] = await connection.query(
          "SELECT 1 FROM Services WHERE ServiceID = ? LIMIT 1",
          [item.serviceId]
        );
        if (serviceRows.length === 0) {
          throw new Error(
            `Послугу з ID ${item.serviceId} в замовленні не знайдено.`
          );
        }
      }

      const totalAmount = servicesInOrder.reduce(
        (sum, item) =>
          sum + parseFloat(item.priceAtOrder) * parseInt(item.quantity),
        0
      );
      const publicOrderId = await generatePublicOrderId(connection);

      const siteOrderSql = `INSERT INTO SiteOrders 
                            (UserID, PublicOrderID, CustomerName, CustomerEmail, CustomerPhone, CustomerNotes, TotalAmount, OrderStatus, OrderDate) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      const [orderResult] = await connection.query(siteOrderSql, [
        userId, // Може бути null
        publicOrderId,
        orderData.customerName,
        orderData.customerEmail,
        orderData.customerPhone,
        orderData.customerNotes || null,
        totalAmount,
        "new", // Початковий статус
      ]);
      const internalOrderId = orderResult.insertId;

      const siteOrderServicesSql = `INSERT INTO SiteOrderServices (OrderID, ServiceID, Quantity, PriceAtOrder) VALUES ?`;
      const serviceValues = servicesInOrder.map((item) => [
        internalOrderId,
        item.serviceId,
        item.quantity,
        item.priceAtOrder,
      ]);
      await connection.query(siteOrderServicesSql, [serviceValues]);

      await connection.commit();
      // Отримуємо створене замовлення для повернення в контролер
      const createdOrder = await this.findById(internalOrderId, connection); // Передаємо connection
      if (!createdOrder) {
        throw new Error(
          "Не вдалося отримати деталі створеного замовлення одразу після створення."
        );
      }
      return createdOrder;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rbError) {
          console.error("Помилка під час відкату транзакції:", rbError);
        }
      }
      console.error("[SiteOrder.create MODEL] Помилка:", error.message);
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new Error(
          `Помилка зовнішнього ключа: один із зазначених ID (користувача або послуги) не знайдено.`
        );
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
        so.OrderID, so.PublicOrderID, so.UserID, 
        COALESCE(u.Username, 'Анонім') AS UserUsername, 
        so.OrderDate, so.OrderStatus, 
        so.CustomerName, so.CustomerEmail, so.CustomerPhone, so.CustomerNotes,
        so.TotalAmount
      FROM SiteOrders so
      LEFT JOIN Users u ON so.UserID = u.UserID /* LEFT JOIN для випадків, коли UserID може бути NULL */
    `;
    const params = [];
    const whereClauses = [];

    if (
      userIdFilter !== null &&
      !isNaN(parseInt(userIdFilter)) &&
      parseInt(userIdFilter) > 0
    ) {
      whereClauses.push("so.UserID = ?");
      params.push(parseInt(userIdFilter));
    }
    if (statusFilter) {
      whereClauses.push("so.OrderStatus = ?");
      params.push(statusFilter);
    }
    if (searchTerm) {
      whereClauses.push(
        `(so.CustomerName LIKE ? OR so.CustomerEmail LIKE ? OR so.CustomerPhone LIKE ? OR COALESCE(u.Username, '') LIKE ? OR so.PublicOrderID LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY so.OrderDate DESC";

    const [orders] = await pool.query(sql, params);
    return orders;
  },

  async findById(identifier, dbConnection = pool) {
    let orderSql;
    let queryParam = identifier;

    const idIsNumeric =
      !isNaN(parseInt(identifier)) &&
      String(parseInt(identifier)) === String(identifier);
    const idStartsWithPrefix = String(identifier).startsWith("ZAM-"); // Або ваш префікс

    // Визначаємо, за яким полем шукати
    if (idStartsWithPrefix) {
      orderSql = `
        SELECT so.*, COALESCE(u.Username, 'Анонім') AS UserUsername, COALESCE(u.Email, '') AS UserEmail 
        FROM SiteOrders so 
        LEFT JOIN Users u ON so.UserID = u.UserID 
        WHERE so.PublicOrderID = ?`;
    } else if (idIsNumeric) {
      orderSql = `
        SELECT so.*, COALESCE(u.Username, 'Анонім') AS UserUsername, COALESCE(u.Email, '') AS UserEmail 
        FROM SiteOrders so 
        LEFT JOIN Users u ON so.UserID = u.UserID 
        WHERE so.OrderID = ?`;
      queryParam = parseInt(identifier);
    } else {
      orderSql = `
        SELECT so.*, COALESCE(u.Username, 'Анонім') AS UserUsername, COALESCE(u.Email, '') AS UserEmail 
        FROM SiteOrders so 
        LEFT JOIN Users u ON so.UserID = u.UserID 
        WHERE so.PublicOrderID = ?`;
    }

    const [orderRows] = await dbConnection.query(orderSql, [queryParam]);
    if (orderRows.length === 0) return null;

    const order = orderRows[0];

    // Отримуємо деталі послуг для замовлення
    const servicesSql = `
        SELECT sos.OrderItemID, sos.ServiceID, sos.Quantity, sos.PriceAtOrder, 
               s.ServiceName, s.ServiceDescription 
        FROM SiteOrderServices sos 
        JOIN Services s ON sos.ServiceID = s.ServiceID 
        WHERE sos.OrderID = ?`;
    const [services] = await dbConnection.query(servicesSql, [order.OrderID]);
    order.services = services;

    return order;
  },

  async updateStatus(orderId, newStatus) {
    // orderId тут - це внутрішній, числовий ID (OrderID)
    const validStatuses = [
      "new",
      "processing",
      "completed",
      "cancelled",
      "pending_payment",
      "paid",
      "shipped",
      "delivered",
      "returned",
      "refunded",
    ]; // Розширений список статусів
    if (!validStatuses.includes(newStatus)) {
      throw new Error(
        `Недійсний статус замовлення: ${newStatus}. Статус має бути одним із: ${validStatuses.join(
          ", "
        )}`
      );
    }
    const sql = "UPDATE SiteOrders SET OrderStatus = ? WHERE OrderID = ?";
    const [result] = await pool.query(sql, [newStatus, orderId]);
    return result.affectedRows > 0; // Повертає true, якщо статус було оновлено
  },

  async delete(orderId) {
    // orderId тут - це внутрішній, числовий ID (OrderID)
    // Потрібно також видалити пов'язані записи з SiteOrderServices через транзакцію
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Видаляємо деталі замовлення (послуги)
      const deleteServicesSql =
        "DELETE FROM SiteOrderServices WHERE OrderID = ?";
      await connection.query(deleteServicesSql, [orderId]);

      // 2. Видаляємо саме замовлення
      const deleteOrderSql = "DELETE FROM SiteOrders WHERE OrderID = ?";
      const [result] = await connection.query(deleteOrderSql, [orderId]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rbError) {
          console.error(
            "Помилка під час відкату транзакції при видаленні замовлення:",
            rbError
          );
        }
      }
      console.error("[SiteOrder.delete MODEL] Помилка:", error.message);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },
};
module.exports = SiteOrder;
