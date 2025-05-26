// backend/models/Client.js
const pool = require("../config/db");

const Client = {
  async create({
    clientCompanyName,
    contactPersonLastName,
    contactPersonFirstName,
    contactPersonMiddleName,
    contactPersonPhone,
    contactPersonEmail,
    cooperationStartDate,
  }) {
    const sql = `INSERT INTO Clients 
                 (ClientCompanyName, ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, ContactPersonPhone, ContactPersonEmail, CooperationStartDate) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        clientCompanyName || null,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName || null,
        contactPersonPhone,
        contactPersonEmail || null,
        cooperationStartDate,
      ]);
      return {
        id: result.insertId,
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonPhone,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("ContactPersonPhone"))
          throw new Error(
            "Client with this contact phone number already exists."
          );
        if (error.message.includes("ContactPersonEmail"))
          throw new Error("Client with this contact email already exists.");
      }
      throw error;
    }
  },

  async getAll(searchTerm = "") {
    let sql = `
      SELECT 
        ClientID, ClientCompanyName, 
        ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, 
        ContactPersonPhone, ContactPersonEmail, CooperationStartDate 
      FROM Clients
    `;
    const params = [];
    if (searchTerm) {
      sql += ` WHERE ClientCompanyName LIKE ? 
               OR ContactPersonLastName LIKE ? 
               OR ContactPersonFirstName LIKE ? 
               OR ContactPersonPhone LIKE ? 
               OR ContactPersonEmail LIKE ?`;
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }
    sql +=
      " ORDER BY ClientCompanyName, ContactPersonLastName, ContactPersonFirstName";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(clientId) {
    const sql = `
      SELECT 
        ClientID, ClientCompanyName, 
        ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, 
        ContactPersonPhone, ContactPersonEmail, CooperationStartDate 
      FROM Clients 
      WHERE ClientID = ?
    `;
    const [rows] = await pool.query(sql, [clientId]);
    return rows[0];
  },

  async update(clientId, data) {
    const {
      clientCompanyName,
      contactPersonLastName,
      contactPersonFirstName,
      contactPersonMiddleName,
      contactPersonPhone,
      contactPersonEmail,
      cooperationStartDate,
    } = data;

    const fieldsToUpdate = {};
    if (clientCompanyName !== undefined)
      fieldsToUpdate.ClientCompanyName = clientCompanyName;
    if (contactPersonLastName !== undefined)
      fieldsToUpdate.ContactPersonLastName = contactPersonLastName;
    if (contactPersonFirstName !== undefined)
      fieldsToUpdate.ContactPersonFirstName = contactPersonFirstName;
    if (contactPersonMiddleName !== undefined)
      fieldsToUpdate.ContactPersonMiddleName = contactPersonMiddleName;
    if (contactPersonPhone !== undefined)
      fieldsToUpdate.ContactPersonPhone = contactPersonPhone;
    if (contactPersonEmail !== undefined)
      fieldsToUpdate.ContactPersonEmail = contactPersonEmail;
    if (cooperationStartDate !== undefined)
      fieldsToUpdate.CooperationStartDate = cooperationStartDate;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return { changedRows: 0, message: "No fields to update provided." };
    }

    const fieldEntries = Object.entries(fieldsToUpdate);
    const setClause = fieldEntries.map(([key, _]) => `${key} = ?`).join(", ");
    const values = fieldEntries.map(([_, value]) => value);
    values.push(clientId);

    const sql = `UPDATE Clients SET ${setClause} WHERE ClientID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("ContactPersonPhone"))
          throw new Error(
            "Update failed. Client with this contact phone number already exists."
          );
        if (error.message.includes("ContactPersonEmail"))
          throw new Error(
            "Update failed. Client with this contact email already exists."
          );
      }
      throw error;
    }
  },

  async delete(clientId) {
    // Перевірка, чи клієнт пов'язаний з кампаніями
    const checkCampaignsSql =
      "SELECT 1 FROM Campaigns WHERE ClientID = ? LIMIT 1";
    const [campaignRows] = await pool.query(checkCampaignsSql, [clientId]);
    if (campaignRows.length > 0) {
      throw new Error(
        "Cannot delete client. This client is associated with one or more campaigns. Please reassign or delete campaigns first."
      );
    }

    const sql = "DELETE FROM Clients WHERE ClientID = ?";
    const [result] = await pool.query(sql, [clientId]);
    return result.affectedRows > 0;
  },
};

module.exports = Client;
