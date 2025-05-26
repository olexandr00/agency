// backend/models/Campaign.js
const pool = require("../config/db");

const Campaign = {
  // Допоміжні функції для перевірки існування ClientID та EmployeeID
  async _checkClientExists(clientId) {
    if (clientId === null || clientId === undefined) return;
    const [client] = await pool.query(
      "SELECT ClientID FROM Clients WHERE ClientID = ?",
      [clientId]
    );
    if (client.length === 0) {
      throw new Error(`Client with ID ${clientId} not found.`);
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
        `Active employee with ID ${employeeId} not found or employee is dismissed.`
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
        campaignBudget || null,
        campaignStatus || "Planned",
        campaignDescription || null,
      ]);
      return { id: result.insertId, campaignName, clientId, campaignStatus };
    } catch (error) {
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (error.message.includes("campaigns_ibfk_1"))
          throw new Error(
            `Invalid ClientID: ${clientId}. Client does not exist.`
          );
        if (error.message.includes("campaigns_ibfk_2"))
          throw new Error(
            `Invalid ResponsibleEmployeeID: ${responsibleEmployeeId}. Employee does not exist or is dismissed.`
          );
      }
      throw error;
    }
  },

  async getAll(searchTerm = "", filters = {}) {
    let sql = `
      SELECT 
        c.CampaignID, c.CampaignName, 
        c.ClientID, cl.ClientCompanyName, cl.ContactPersonFirstName AS ClientFirstName, cl.ContactPersonLastName AS ClientLastName,
        c.ResponsibleEmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS ResponsibleEmployeeName,
        c.StartDate, c.EndDate, c.CampaignBudget, c.CampaignStatus, c.CampaignDescription
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
      params.push(filters.clientId);
    }
    if (filters.employeeId) {
      whereClauses.push(`c.ResponsibleEmployeeID = ?`);
      params.push(filters.employeeId);
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
        c.ResponsibleEmployeeID, CONCAT(e.FirstName, ' ', e.LastName) AS ResponsibleEmployeeName, e.Email AS ResponsibleEmployeeEmail,
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

    // Видалено логіку для assignedEmployees
    // campaign.assignedEmployees = []; // Можна повернути порожній масив, якщо фронтенд очікує цю властивість

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

    if (clientId !== undefined) {
      await this._checkClientExists(clientId);
    }
    if (responsibleEmployeeId !== undefined) {
      if (responsibleEmployeeId !== null) {
        await this._checkEmployeeExists(responsibleEmployeeId);
      }
    }

    const fieldsToUpdate = {};
    if (campaignName !== undefined) fieldsToUpdate.CampaignName = campaignName;
    if (clientId !== undefined) fieldsToUpdate.ClientID = clientId;
    if (responsibleEmployeeId !== undefined)
      fieldsToUpdate.ResponsibleEmployeeID = responsibleEmployeeId;
    if (startDate !== undefined) fieldsToUpdate.StartDate = startDate;
    if (endDate !== undefined) fieldsToUpdate.EndDate = endDate;
    if (campaignBudget !== undefined)
      fieldsToUpdate.CampaignBudget = campaignBudget;
    if (campaignStatus !== undefined)
      fieldsToUpdate.CampaignStatus = campaignStatus;
    if (campaignDescription !== undefined)
      fieldsToUpdate.CampaignDescription = campaignDescription;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return { changedRows: 0, message: "No fields to update provided." };
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
            `Update failed. Invalid ClientID. Client does not exist.`
          );
        if (error.message.includes("campaigns_ibfk_2"))
          throw new Error(
            `Update failed. Invalid ResponsibleEmployeeID. Employee does not exist or is dismissed.`
          );
      }
      throw error;
    }
  },

  async delete(campaignId) {
    // Видаляємо пов'язані записи з Campaign_Services
    const deleteServicesSql =
      "DELETE FROM Campaign_Services WHERE CampaignID = ?";
    await pool.query(deleteServicesSql, [campaignId]);

    // Тепер видаляємо саму кампанію
    const sql = "DELETE FROM Campaigns WHERE CampaignID = ?";
    const [result] = await pool.query(sql, [campaignId]);
    return result.affectedRows > 0;
  },

  // --- Методи для Campaign_Services ---
  async addServiceToCampaign(campaignId, serviceId, quantity) {
    const checkCampaignSql =
      "SELECT 1 FROM Campaigns WHERE CampaignID = ? LIMIT 1";
    const [campaignRows] = await pool.query(checkCampaignSql, [campaignId]);
    if (campaignRows.length === 0)
      throw new Error(`Campaign with ID ${campaignId} not found.`);

    const checkServiceSql =
      "SELECT 1 FROM Services WHERE ServiceID = ? LIMIT 1";
    const [serviceRows] = await pool.query(checkServiceSql, [serviceId]);
    if (serviceRows.length === 0)
      throw new Error(`Service with ID ${serviceId} not found.`);

    const sql =
      "INSERT INTO Campaign_Services (CampaignID, ServiceID, ServiceQuantity) VALUES (?, ?, ?)";
    try {
      const [result] = await pool.query(sql, [campaignId, serviceId, quantity]);
      return { id: result.insertId, campaignId, serviceId, quantity };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new Error(
          `Service with ID ${serviceId} is already added to campaign ID ${campaignId}.`
        );
      }
      throw error;
    }
  },

  async updateServiceInCampaign(campaignId, serviceId, quantity) {
    const sql =
      "UPDATE Campaign_Services SET ServiceQuantity = ? WHERE CampaignID = ? AND ServiceID = ?";
    const [result] = await pool.query(sql, [quantity, campaignId, serviceId]);
    if (result.affectedRows === 0) {
      throw new Error(
        `Service with ID ${serviceId} not found in campaign ID ${campaignId}, or quantity was not changed.`
      );
    }
    return { campaignId, serviceId, quantity, changed: result.changedRows > 0 };
  },

  async removeServiceFromCampaign(campaignId, serviceId) {
    const sql =
      "DELETE FROM Campaign_Services WHERE CampaignID = ? AND ServiceID = ?";
    const [result] = await pool.query(sql, [campaignId, serviceId]);
    return result.affectedRows > 0;
  },
};

module.exports = Campaign;
