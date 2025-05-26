// backend/models/ContactMessage.js
const pool = require("../config/db");

const ContactMessage = {
  async create({
    senderName,
    senderEmail,
    senderPhone,
    messageSubject,
    messageText,
  }) {
    const sql = `INSERT INTO ContactMessages 
                 (SenderName, SenderEmail, SenderPhone, MessageSubject, MessageText, IsRead) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        senderName,
        senderEmail,
        senderPhone || null,
        messageSubject || null,
        messageText,
        0, // За замовчуванням не прочитано
      ]);
      return {
        id: result.insertId,
        senderName,
        senderEmail,
        submissionDate: new Date(), // Приблизна дата, точна буде з БД
      };
    } catch (error) {
      throw error;
    }
  },

  async getAll({ searchTerm = "", isReadFilter = null } = {}) {
    // isReadFilter: boolean (true for read, false for unread, null for all)
    let sql = `
      SELECT 
        MessageID, SenderName, SenderEmail, SenderPhone, 
        MessageSubject, MessageText, SubmissionDate, IsRead
      FROM ContactMessages
    `;
    const params = [];
    const whereClauses = [];

    if (searchTerm) {
      whereClauses.push(
        `(SenderName LIKE ? OR SenderEmail LIKE ? OR MessageSubject LIKE ? OR MessageText LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term);
    }
    if (isReadFilter !== null && isReadFilter !== undefined) {
      whereClauses.push("IsRead = ?");
      params.push(isReadFilter ? 1 : 0);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY SubmissionDate DESC";

    const [messages] = await pool.query(sql, params);
    return messages;
  },

  async findById(messageId) {
    const sql = `
      SELECT 
        MessageID, SenderName, SenderEmail, SenderPhone, 
        MessageSubject, MessageText, SubmissionDate, IsRead
      FROM ContactMessages 
      WHERE MessageID = ?
    `;
    const [rows] = await pool.query(sql, [messageId]);
    return rows[0];
  },

  async markAsRead(messageId, readStatus = true) {
    const sql = "UPDATE ContactMessages SET IsRead = ? WHERE MessageID = ?";
    const [result] = await pool.query(sql, [readStatus ? 1 : 0, messageId]);
    return result.affectedRows > 0;
  },

  async delete(messageId) {
    const sql = "DELETE FROM ContactMessages WHERE MessageID = ?";
    const [result] = await pool.query(sql, [messageId]);
    return result.affectedRows > 0;
  },

  async getUnreadCount() {
    const sql =
      "SELECT COUNT(*) as unreadCount FROM ContactMessages WHERE IsRead = 0";
    const [rows] = await pool.query(sql);
    return rows[0].unreadCount;
  },
};

module.exports = ContactMessage;
