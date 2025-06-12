// backend/models/Service.js
const pool = require("../config/db");

const Service = {
  async create({ serviceName, serviceDescription, basePrice }) {
    const trimmedServiceName = serviceName ? String(serviceName).trim() : "";
    const trimmedServiceDescription = serviceDescription
      ? String(serviceDescription).trim()
      : null;

    if (!trimmedServiceName) {
      throw new Error(
        "Назва послуги є обов'язковою і не може складатися лише з пробілів."
      );
    }

    const sql =
      "INSERT INTO Services (ServiceName, ServiceDescription, BasePrice) VALUES (?, ?, ?)";
    try {
      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        throw new Error("Базова ціна (BasePrice) має бути невід'ємним числом.");
      }

      const [result] = await pool.query(sql, [
        trimmedServiceName,
        trimmedServiceDescription,
        price,
      ]);
      return {
        id: result.insertId,
        serviceName: trimmedServiceName,
        serviceDescription: trimmedServiceDescription,
        basePrice: price,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("ServiceName")
      ) {
        throw new Error("Послуга з такою назвою вже існує.");
      }
      console.error("Помилка при створенні послуги в моделі:", error);
      throw error;
    }
  },

  async getAll(searchTerm = "") {
    let sql =
      "SELECT ServiceID, ServiceName, ServiceDescription, BasePrice FROM Services";
    const params = [];
    if (searchTerm) {
      const trimmedSearchTerm = searchTerm.trim();
      if (trimmedSearchTerm) {
        // Додаємо умову, тільки якщо пошуковий термін не порожній після trim
        sql += " WHERE ServiceName LIKE ? OR ServiceDescription LIKE ?";
        params.push(`%${trimmedSearchTerm}%`, `%${trimmedSearchTerm}%`);
      }
    }
    sql += " ORDER BY ServiceName";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(serviceId) {
    const sql =
      "SELECT ServiceID, ServiceName, ServiceDescription, BasePrice FROM Services WHERE ServiceID = ?";
    const [rows] = await pool.query(sql, [serviceId]);
    return rows.length > 0 ? rows[0] : null;
  },

  async update(serviceId, data) {
    let { serviceName, serviceDescription, basePrice } = data;
    const fieldsToUpdate = {};

    if (serviceName !== undefined) {
      const trimmedServiceName = String(serviceName).trim();
      if (!trimmedServiceName) {
        throw new Error(
          "Назва послуги не може бути порожньою або складатися лише з пробілів при оновленні."
        );
      }
      fieldsToUpdate.ServiceName = trimmedServiceName;
    }
    if (serviceDescription !== undefined) {
      fieldsToUpdate.ServiceDescription =
        serviceDescription === null ? null : String(serviceDescription).trim();
      if (fieldsToUpdate.ServiceDescription === "")
        fieldsToUpdate.ServiceDescription = null; // Якщо порожній рядок після trim, робимо null
    }

    if (basePrice !== undefined) {
      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        throw new Error("Базова ціна (BasePrice) має бути невід'ємним числом.");
      }
      fieldsToUpdate.BasePrice = price;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return {
        affectedRows: 0,
        changedRows: 0,
        message: "Дані для оновлення не надано.",
      };
    }

    const fieldEntries = Object.entries(fieldsToUpdate);
    const setClause = fieldEntries.map(([key, _]) => `${key} = ?`).join(", ");
    const values = fieldEntries.map(([_, value]) => value);
    values.push(serviceId);

    const sql = `UPDATE Services SET ${setClause} WHERE ServiceID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        changedRows: result.changedRows,
        affectedRows: result.affectedRows,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("ServiceName")
      ) {
        throw new Error("Інша послуга з такою назвою вже існує.");
      }
      console.error("Помилка при оновленні послуги в моделі:", error);
      throw error;
    }
  },

  async delete(serviceId) {
    const sql = "DELETE FROM Services WHERE ServiceID = ?";
    try {
      const [result] = await pool.query(sql, [serviceId]);
      return result.affectedRows > 0;
    } catch (error) {
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        (error.sqlState && error.sqlState.startsWith("23"))
      ) {
        // 23000 - integrity constraint violation
        throw new Error(
          "Неможливо видалити послугу, оскільки вона використовується в інших записах (наприклад, кампаніях, замовленнях або відгуках). Спочатку видаліть або змініть пов'язані записи."
        );
      }
      console.error("Помилка при видаленні послуги в моделі:", error);
      throw error;
    }
  },

  async updateAllPricesByPercentage(percentageChange) {
    const numericPercentage = parseFloat(percentageChange);

    if (isNaN(numericPercentage)) {
      throw new Error("Відсоток зміни має бути числовим значенням.");
    }

    if (numericPercentage <= -100) {
      throw new Error(
        "Зміна ціни не може бути -100% або менше, оскільки це призведе до нульової або від'ємної ціни."
      );
    }
    const multiplier = 1 + parseFloat(numericPercentage) / 100;

    const sql = `UPDATE Services SET BasePrice = ROUND(BasePrice * ?, 2)`;

    try {
      const [result] = await pool.query(sql, [multiplier]);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      throw new Error("Не вдалося оновити ціни послуг: " + error.message);
    }
  },
};

module.exports = Service;
