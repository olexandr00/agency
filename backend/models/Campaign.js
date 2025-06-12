// backend/models/Campaign.js
const pool = require("../config/db");

const Campaign = {
  // Функції для перевірки існування ClientID та EmployeeID
  async _checkClientExists(clientId) {
    if (clientId === null || clientId === undefined) return;
    const [client] = await pool.query(
      "SELECT ClientID FROM Clients WHERE ClientID = ?",
      [clientId]
    );
    if (client.length === 0) {
      throw new Error(`Клієнта з ID ${clientId} не знайдено.`);
    }
  },

  async _checkEmployeeExists(employeeId) {
    if (employeeId === null || employeeId === undefined) return;
    const [employee] = await pool.query(
      "SELECT EmployeeID FROM Employees WHERE EmployeeID = ? AND DismissalDate IS NULL",
      [employeeId]
    );
    if (employee.length === 0) {
      throw new Error(
        `Активного працівника з ID ${employeeId} не знайдено або працівник звільнений.`
      );
    }
  },

  async create({
    campaignName,
    clientId,
    responsibleEmployeeId,
    startDate,
    endDate,
    campaignBudget,
    campaignStatus,
    campaignDescription,
  }) {
    await this._checkClientExists(clientId);
    if (responsibleEmployeeId) {
      // Дозволяємо null для responsibleEmployeeId
      await this._checkEmployeeExists(responsibleEmployeeId);
    }

    const sql = `INSERT INTO Campaigns 
                 (CampaignName, ClientID, ResponsibleEmployeeID, StartDate, EndDate, CampaignBudget, CampaignStatus, CampaignDescription) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        campaignName,
        clientId,
        responsibleEmployeeId || null,
        startDate || null,
        endDate || null,
        campaignBudget === undefined || campaignBudget === ""
          ? null
          : campaignBudget, // Дозволяємо null
        campaignStatus || "Planned", // За замовчуванням "Planned"
        campaignDescription || null,
      ]);
      return { id: result.insertId, campaignName, clientId, campaignStatus };
    } catch (error) {
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (error.message.includes("campaigns_ibfk_1"))
          // Назва обмеження для ClientID
          throw new Error(`Недійсний ClientID: ${clientId}. Клієнт не існує.`);
        if (error.message.includes("campaigns_ibfk_2"))
          // Назва обмеження для ResponsibleEmployeeID
          throw new Error(
            `Недійсний ResponsibleEmployeeID: ${responsibleEmployeeId}. Працівник не існує або звільнений.`
          );
      }
      throw error; // Перекидаємо інші помилки
    }
  },

  async getAll(searchTerm = "", filters = {}) {
    let sql = `
      SELECT 
        c.CampaignID, c.CampaignName, 
        c.ClientID, cl.ClientCompanyName, cl.ContactPersonFirstName AS ClientFirstName, cl.ContactPersonLastName AS ClientLastName,
        c.ResponsibleEmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS ResponsibleEmployeeName,
        c.StartDate, c.EndDate, c.CampaignBudget, c.CampaignStatus, c.CampaignDescription,
        (SELECT SUM(s.BasePrice * cs.ServiceQuantity) FROM Campaign_Services cs JOIN Services s ON cs.ServiceID = s.ServiceID WHERE cs.CampaignID = c.CampaignID) AS ActualCampaignCost
      FROM Campaigns c
      JOIN Clients cl ON c.ClientID = cl.ClientID
      LEFT JOIN Employees e ON c.ResponsibleEmployeeID = e.EmployeeID 
    `;

    const params = [];
    const whereClauses = [];

    if (searchTerm) {
      whereClauses.push(
        `(c.CampaignName LIKE ? OR cl.ClientCompanyName LIKE ? OR CONCAT(e.FirstName, ' ', e.LastName) LIKE ? OR c.CampaignDescription LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term);
    }

    if (filters.status) {
      whereClauses.push(`c.CampaignStatus = ?`);
      params.push(filters.status);
    }
    if (filters.clientId) {
      whereClauses.push(`c.ClientID = ?`);
      params.push(parseInt(filters.clientId)); // Переконуємось, що це число
    }
    if (filters.employeeId) {
      whereClauses.push(`c.ResponsibleEmployeeID = ?`);
      params.push(parseInt(filters.employeeId)); // Переконуємось, що це число
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY c.StartDate DESC, c.CampaignName";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(campaignId) {
    const sql = `
      SELECT 
        c.CampaignID, c.CampaignName, 
        c.ClientID, cl.ClientCompanyName, cl.ContactPersonFirstName AS ClientFirstName, cl.ContactPersonLastName AS ClientLastName,
        c.ResponsibleEmployeeID, e.EmployeeID AS RespEmployeeID_raw, CONCAT(e.FirstName, ' ', e.LastName) AS ResponsibleEmployeeName, e.Email AS ResponsibleEmployeeEmail,
        c.StartDate, c.EndDate, c.CampaignBudget, c.CampaignStatus, c.CampaignDescription
      FROM Campaigns c
      JOIN Clients cl ON c.ClientID = cl.ClientID
      LEFT JOIN Employees e ON c.ResponsibleEmployeeID = e.EmployeeID
      WHERE c.CampaignID = ?
    `;
    const [rows] = await pool.query(sql, [campaignId]);

    if (rows.length === 0) return null;
    const campaign = rows[0];

    // Отримати пов'язані послуги
    const servicesSql = `
        SELECT s.ServiceID, s.ServiceName, s.BasePrice, cs.ServiceQuantity 
        FROM Campaign_Services cs
        JOIN Services s ON cs.ServiceID = s.ServiceID
        WHERE cs.CampaignID = ?
    `;
    const [services] = await pool.query(servicesSql, [campaignId]);
    campaign.services = services;

    campaign.actualCampaignCost = services.reduce((total, service) => {
      return (
        total +
        parseFloat(service.BasePrice) * parseInt(service.ServiceQuantity)
      );
    }, 0);

    return campaign;
  },

  async update(campaignId, data) {
    const {
      campaignName,
      clientId,
      responsibleEmployeeId,
      startDate,
      endDate,
      campaignBudget,
      campaignStatus,
      campaignDescription,
    } = data;

    // Валідація існування ClientID та EmployeeID, якщо вони передані для оновлення
    if (clientId !== undefined) {
      // clientId може бути 0, тому перевіряємо на undefined
      await this._checkClientExists(clientId);
    }
    if (responsibleEmployeeId !== undefined) {
      // responsibleEmployeeId може бути null
      if (responsibleEmployeeId !== null) {
        // Якщо не null, то перевіряємо існування
        await this._checkEmployeeExists(responsibleEmployeeId);
      }
    }

    const fieldsToUpdate = {};
    if (campaignName !== undefined) fieldsToUpdate.CampaignName = campaignName;
    if (clientId !== undefined) fieldsToUpdate.ClientID = clientId;
    if (responsibleEmployeeId !== undefined)
      fieldsToUpdate.ResponsibleEmployeeID = responsibleEmployeeId; // Дозволяємо null
    if (startDate !== undefined) fieldsToUpdate.StartDate = startDate; // Дозволяємо null
    if (endDate !== undefined) fieldsToUpdate.EndDate = endDate; // Дозволяємо null
    if (campaignBudget !== undefined)
      fieldsToUpdate.CampaignBudget = campaignBudget; // Дозволяємо null
    if (campaignStatus !== undefined)
      fieldsToUpdate.CampaignStatus = campaignStatus;
    if (campaignDescription !== undefined)
      fieldsToUpdate.CampaignDescription = campaignDescription; // Дозволяємо null

    if (Object.keys(fieldsToUpdate).length === 0) {
      return {
        affectedRows: 1,
        changedRows: 0,
        message: "Дані для оновлення не надано.",
      };
    }

    const fieldEntries = Object.entries(fieldsToUpdate);
    const setClause = fieldEntries.map(([key, _]) => `${key} = ?`).join(", ");
    const values = fieldEntries.map(([_, value]) => value);
    values.push(campaignId);

    const sql = `UPDATE Campaigns SET ${setClause} WHERE CampaignID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (error.message.includes("campaigns_ibfk_1"))
          throw new Error(
            `Оновлення не вдалося. Недійсний ClientID. Клієнт не існує.`
          );
        if (error.message.includes("campaigns_ibfk_2"))
          throw new Error(
            `Оновлення не вдалося. Недійсний ResponsibleEmployeeID. Працівник не існує або звільнений.`
          );
      }
      throw error;
    }
  },

  async delete(campaignId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Видаляємо пов'язані записи з Campaign_Services
      const deleteServicesSql =
        "DELETE FROM Campaign_Services WHERE CampaignID = ?";
      await connection.query(deleteServicesSql, [campaignId]);

      // 2. Тепер видаляємо саму кампанію
      const deleteCampaignSql = "DELETE FROM Campaigns WHERE CampaignID = ?";
      const [result] = await connection.query(deleteCampaignSql, [campaignId]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      console.error("Помилка під час видалення кампанії (транзакція):", error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // Методи для Campaign_Services
  async addServiceToCampaign(campaignId, serviceId, quantity) {
    // Перевірка існування кампанії
    const checkCampaignSql =
      "SELECT 1 FROM Campaigns WHERE CampaignID = ? LIMIT 1";
    const [campaignRows] = await pool.query(checkCampaignSql, [campaignId]);
    if (campaignRows.length === 0)
      throw new Error(`Кампанію з ID ${campaignId} не знайдено.`);

    // Перевірка існування послуги
    const checkServiceSql =
      "SELECT 1 FROM Services WHERE ServiceID = ? LIMIT 1";
    const [serviceRows] = await pool.query(checkServiceSql, [serviceId]);
    if (serviceRows.length === 0)
      throw new Error(`Послугу з ID ${serviceId} не знайдено.`);

    const sql =
      "INSERT INTO Campaign_Services (CampaignID, ServiceID, ServiceQuantity) VALUES (?, ?, ?)";
    try {
      const [result] = await pool.query(sql, [campaignId, serviceId, quantity]);
      return { id: result.insertId, campaignId, serviceId, quantity };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        // Унікальний ключ (CampaignID, ServiceID)
        throw new Error(
          `Послуга з ID ${serviceId} вже додана до кампанії ID ${campaignId}.`
        );
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (error.message.includes("campaign_services_ibfk_1")) {
          // FK на Campaigns
          throw new Error(
            `Кампанію з ID ${campaignId} не знайдено для додавання послуги.`
          );
        }
        if (error.message.includes("campaign_services_ibfk_2")) {
          // FK на Services
          throw new Error(
            `Послугу з ID ${serviceId} не знайдено для додавання до кампанії.`
          );
        }
      }
      throw error;
    }
  },

  async updateServiceInCampaign(campaignId, serviceId, quantity) {
    const sql =
      "UPDATE Campaign_Services SET ServiceQuantity = ? WHERE CampaignID = ? AND ServiceID = ?";
    const [result] = await pool.query(sql, [quantity, campaignId, serviceId]);

    if (result.affectedRows === 0) {
      // Перевіряємо, чи існує такий запис взагалі
      const checkExistenceSql =
        "SELECT 1 FROM Campaign_Services WHERE CampaignID = ? AND ServiceID = ?";
      const [existingRows] = await pool.query(checkExistenceSql, [
        campaignId,
        serviceId,
      ]);
      if (existingRows.length === 0) {
        throw new Error(
          `Послугу з ID ${serviceId} не знайдено в кампанії ID ${campaignId}.`
        );
      }
      throw new Error(
        `Послугу з ID ${serviceId} не знайдено в кампанії ID ${campaignId} для оновлення.`
      );
    }
    return { campaignId, serviceId, quantity, changed: result.changedRows > 0 };
  },

  async removeServiceFromCampaign(campaignId, serviceId) {
    const sql =
      "DELETE FROM Campaign_Services WHERE CampaignID = ? AND ServiceID = ?";
    const [result] = await pool.query(sql, [campaignId, serviceId]);
    return result.affectedRows > 0; // Повертає true, якщо було видалено, false - якщо ні (не знайдено)
  },
};

module.exports = Campaign;
