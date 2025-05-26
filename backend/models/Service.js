// backend/models/Service.js
const pool = require("../config/db");

const Service = {
  async create({ serviceName, serviceDescription, basePrice }) {
    const sql =
      "INSERT INTO Services (ServiceName, ServiceDescription, BasePrice) VALUES (?, ?, ?)";
    try {
      const [result] = await pool.query(sql, [
        serviceName,
        serviceDescription,
        basePrice,
      ]);
      return {
        id: result.insertId,
        serviceName,
        serviceDescription,
        basePrice,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("ServiceName")
      ) {
        throw new Error("Service with this name already exists.");
      }
      throw error;
    }
  },

  async getAll(searchTerm = "") {
    let sql = "SELECT * FROM Services";
    const params = [];
    if (searchTerm) {
      sql += " WHERE ServiceName LIKE ? OR ServiceDescription LIKE ?";
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    sql += " ORDER BY ServiceName";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(serviceId) {
    const sql = "SELECT * FROM Services WHERE ServiceID = ?";
    const [rows] = await pool.query(sql, [serviceId]);
    return rows[0];
  },

  async update(serviceId, { serviceName, serviceDescription, basePrice }) {
    // Перевіряємо, які поля були передані для оновлення
    const fieldsToUpdate = {};
    if (serviceName !== undefined) fieldsToUpdate.ServiceName = serviceName;
    if (serviceDescription !== undefined)
      fieldsToUpdate.ServiceDescription = serviceDescription;
    if (basePrice !== undefined) fieldsToUpdate.BasePrice = basePrice;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return { changedRows: 0, message: "No fields to update provided." }; // Нічого оновлювати
    }

    const fieldEntries = Object.entries(fieldsToUpdate);
    const setClause = fieldEntries
      .map(([key, value]) => `${key} = ?`)
      .join(", ");
    const values = fieldEntries.map(([key, value]) => value);
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
        throw new Error("Another service with this name already exists.");
      }
      throw error;
    }
  },

  async delete(serviceId) {
    // Перед видаленням, перевірте пов'язані дані, якщо потрібно (наприклад, Campaign_Services, SiteOrderServices)
    // Тут для простоти пряме видалення. Можна додати логіку ON DELETE CASCADE/SET NULL в БД
    // або перевіряти тут і повертати помилку, якщо є залежності.

    // Перевірка чи послуга використовується в Campaign_Services
    const checkCampaignServicesSql =
      "SELECT 1 FROM campaign_services WHERE ServiceID = ? LIMIT 1";
    const [campaignServicesRows] = await pool.query(checkCampaignServicesSql, [
      serviceId,
    ]);
    if (campaignServicesRows.length > 0) {
      throw new Error(
        "Cannot delete service. It is used in one or more campaigns. Please remove it from campaigns first."
      );
    }

    // Перевірка чи послуга використовується в SiteOrderServices
    const checkSiteOrderServicesSql =
      "SELECT 1 FROM SiteOrderServices WHERE ServiceID = ? LIMIT 1";
    const [siteOrderServicesRows] = await pool.query(
      checkSiteOrderServicesSql,
      [serviceId]
    );
    if (siteOrderServicesRows.length > 0) {
      // Залежно від бізнес-логіки, можна або заборонити видалення, або
      // встановити ServiceID = NULL в SiteOrderServices (якщо дозволено схемою БД)
      // Або ж просто видалити, якщо логіка дозволяє (але це небезпечно для історії замовлень)
      throw new Error(
        "Cannot delete service. It is part of one or more site orders."
      );
    }

    // Перевірка чи послуга використовується в Reviews
    const checkReviewsSql = "SELECT 1 FROM Reviews WHERE ServiceID = ? LIMIT 1";
    const [reviewRows] = await pool.query(checkReviewsSql, [serviceId]);
    if (reviewRows.length > 0) {
      // Можна або видалити відгуки, або встановити ServiceID в NULL (якщо в FK стоїть ON DELETE SET NULL)
      // Для прикладу, припустимо, що відгуки про видалену послугу можуть залишитись без прив'язки (якщо FK дозволяє)
      // Або ж вимагати видалення відгуків спочатку. Зараз стоїть ON DELETE SET NULL.
    }

    const sql = "DELETE FROM Services WHERE ServiceID = ?";
    const [result] = await pool.query(sql, [serviceId]);
    return result.affectedRows > 0;
  },
};

module.exports = Service;
