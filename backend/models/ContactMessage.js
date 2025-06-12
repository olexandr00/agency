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
                 (SenderName, SenderEmail, SenderPhone, MessageSubject, MessageText, IsRead, SubmissionDate) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`;
    try {
      const [result] = await pool.query(sql, [
        senderName,
        senderEmail,
        senderPhone || null,
        messageSubject || null,
        messageText,
        0, // За замовчуванням не прочитано (false)
      ]);

      return {
        id: result.insertId,
        senderName, // Для відповіді клієнту
      };
    } catch (error) {
      console.error(
        "Помилка при створенні контактного повідомлення в моделі:",
        error
      );
      throw error; // Перекидаємо помилку далі
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
        `(SenderName LIKE ? OR SenderEmail LIKE ? OR SenderPhone LIKE ? OR MessageSubject LIKE ? OR MessageText LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }

    // Важливо: IsRead в БД це TINYINT(1), 0 для false, 1 для true
    if (isReadFilter !== null && isReadFilter !== undefined) {
      whereClauses.push("IsRead = ?");
      params.push(isReadFilter ? 1 : 0); // Конвертуємо булеве значення в 0 або 1
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += " ORDER BY SubmissionDate DESC";

    const [messages] = await pool.query(sql, params);
    // Конвертуємо IsRead з 0/1 в true/false для зручності на фронтенді
    return messages.map((message) => ({
      ...message,
      IsRead: !!message.IsRead, // !!0 -> false, !!1 -> true
    }));
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
    if (rows.length > 0) {
      const message = rows[0];
      return {
        ...message,
        IsRead: !!message.IsRead,
      };
    }
    return null; // Повертаємо null, якщо не знайдено
  },

  async markAsRead(messageId, readStatus = true) {
    // readStatus очікується як булеве значення true/false
    const sql = "UPDATE ContactMessages SET IsRead = ? WHERE MessageID = ?";
    // Конвертуємо булеве значення в 0 або 1 для запису в БД
    const [result] = await pool.query(sql, [readStatus ? 1 : 0, messageId]);
    return result.affectedRows > 0; // Повертає true, якщо рядок було оновлено
  },

  async delete(messageId) {
    const sql = "DELETE FROM ContactMessages WHERE MessageID = ?";
    const [result] = await pool.query(sql, [messageId]);
    return result.affectedRows > 0; // Повертає true, якщо рядок було видалено
  },

  async getUnreadCount() {
    const sql =
      "SELECT COUNT(*) as unreadCount FROM ContactMessages WHERE IsRead = 0"; // IsRead = 0 означає непрочитане
    const [rows] = await pool.query(sql);
    return rows[0].unreadCount;
  },
};

module.exports = ContactMessage;
