// backend/models/Review.js
const pool = require("../config/db");

const Review = {
  async create({ userId, serviceId, reviewText, rating, isApproved = 0 }) {
    // Перевірка існування користувача
    const [userRows] = await pool.query(
      "SELECT 1 FROM Users WHERE UserID = ?",
      [userId]
    );
    if (userRows.length === 0) {
      throw new Error(`Користувача з ID ${userId} не знайдено.`);
    }

    // Перевірка існування послуги, якщо serviceId передано
    if (serviceId !== null && serviceId !== undefined) {
      const [serviceRows] = await pool.query(
        "SELECT 1 FROM Services WHERE ServiceID = ?",
        [serviceId]
      );
      if (serviceRows.length === 0) {
        throw new Error(`Послугу з ID ${serviceId} не знайдено.`);
      }
    } else {
      serviceId = null; // Явно встановлюємо null, якщо не передано
    }

    const sql = `INSERT INTO Reviews (UserID, ServiceID, ReviewText, Rating, IsApproved, ReviewDate) 
                 VALUES (?, ?, ?, ?, ?, NOW())`;

    try {
      const [result] = await pool.query(sql, [
        userId,
        serviceId,
        reviewText,
        // Переконуємося, що рейтинг є числом або null
        rating !== undefined && rating !== null && String(rating).trim() !== ""
          ? parseInt(rating)
          : null,
        isApproved ? 1 : 0, // Конвертуємо boolean в 0/1
      ]);
      // Повертаємо створений об'єкт з ID
      return this.findById(result.insertId);
    } catch (error) {
      // Обробка помилок зовнішніх ключів (якщо попередні перевірки не спрацювали)
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (
          error.message.includes("FK_Review_User") ||
          error.message.toLowerCase().includes("userid")
        ) {
          throw new Error(
            `Користувача з ID ${userId} не знайдено (помилка зовнішнього ключа).`
          );
        }
        if (
          error.message.includes("FK_Review_Service") ||
          error.message.toLowerCase().includes("serviceid")
        ) {
          throw new Error(
            `Послугу з ID ${serviceId} не знайдено (помилка зовнішнього ключа).`
          );
        }
      }
      console.error("Помилка при створенні відгуку в моделі:", error);
      throw error; // Перекидаємо інші помилки
    }
  },

  async getAll({
    isAdmin = false,
    searchTerm = "",
    serviceIdFilter = null,
    userIdFilter = null,
    approvedFilter = null, // boolean: true (схвалені), false (не схвалені), null (залежить від isAdmin)
  } = {}) {
    let sql = `
      SELECT 
        r.ReviewID, r.UserID, u.Username AS UserName, u.Email AS UserEmail,
        r.ServiceID, s.ServiceName,
        r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
      FROM Reviews r
      JOIN Users u ON r.UserID = u.UserID
      LEFT JOIN Services s ON r.ServiceID = s.ServiceID
    `;

    const params = [];
    const whereClauses = [];

    // Логіка фільтрації за статусом схвалення
    if (approvedFilter !== null && approvedFilter !== undefined) {
      whereClauses.push("r.IsApproved = ?");
      params.push(approvedFilter ? 1 : 0); // true -> 1, false -> 0
    } else {
      if (!isAdmin) {
        whereClauses.push("r.IsApproved = 1");
      }
    }

    if (searchTerm) {
      whereClauses.push(
        `(r.ReviewText LIKE ? OR u.Username LIKE ? OR u.Email LIKE ? OR s.ServiceName LIKE ?)` // Додано пошук по email користувача
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term);
    }
    if (
      serviceIdFilter !== null &&
      serviceIdFilter !== undefined &&
      String(serviceIdFilter).trim() !== ""
    ) {
      whereClauses.push("r.ServiceID = ?");
      params.push(parseInt(serviceIdFilter));
    }
    if (
      userIdFilter !== null &&
      userIdFilter !== undefined &&
      String(userIdFilter).trim() !== "" &&
      isAdmin
    ) {
      whereClauses.push("r.UserID = ?");
      params.push(parseInt(userIdFilter));
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY r.ReviewDate DESC";

    try {
      const [rows] = await pool.query(sql, params);
      // Конвертуємо IsApproved з 0/1 в true/false
      return rows.map((review) => ({
        ...review,
        IsApproved: !!review.IsApproved,
      }));
    } catch (dbError) {
      console.error("[Review.getAll MODEL] Помилка бази даних:", dbError);
      throw dbError;
    }
  },

  async findById(reviewId) {
    const sql = `
      SELECT 
        r.ReviewID, r.UserID, u.Username AS UserName, u.Email AS UserEmail,
        r.ServiceID, s.ServiceName,
        r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
      FROM Reviews r
      JOIN Users u ON r.UserID = u.UserID
      LEFT JOIN Services s ON r.ServiceID = s.ServiceID
      WHERE r.ReviewID = ?
    `;
    const [rows] = await pool.query(sql, [reviewId]);
    if (rows.length > 0) {
      const review = rows[0];
      return {
        ...review,
        IsApproved: !!review.IsApproved, // Конвертуємо 0/1 в true/false
      };
    }
    return null; // Повертаємо null, якщо не знайдено
  },

  async update(reviewId, data) {
    const { reviewText, rating, isApproved } = data; // isApproved очікується як boolean
    const fieldsToUpdate = {};

    if (reviewText !== undefined) fieldsToUpdate.ReviewText = reviewText;
    if (rating !== undefined) {
      fieldsToUpdate.Rating =
        rating === null || String(rating).trim() === ""
          ? null
          : parseInt(rating);
    }
    if (isApproved !== undefined) {
      // isApproved очікується як boolean від контролера
      fieldsToUpdate.IsApproved = isApproved ? 1 : 0; // boolean -> 0/1 для БД
    }

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
    values.push(reviewId);

    const sql = `UPDATE Reviews SET ${setClause} WHERE ReviewID = ?`;
    const [result] = await pool.query(sql, values);
    return {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
    };
  },

  async approve(reviewId, approveStatusBoolean) {
    // Очікує boolean (true для схвалення, false для відхилення)
    const sql = "UPDATE Reviews SET IsApproved = ? WHERE ReviewID = ?";
    const [result] = await pool.query(sql, [
      approveStatusBoolean ? 1 : 0, // Конвертує boolean в 0/1 для запису в БД
      reviewId,
    ]);
    return result.affectedRows > 0; // Повертає true, якщо рядок було оновлено
  },

  async delete(reviewId) {
    const sql = "DELETE FROM Reviews WHERE ReviewID = ?";
    const [result] = await pool.query(sql, [reviewId]);
    return result.affectedRows > 0; // Повертає true, якщо рядок було видалено
  },

  async getByServiceId(serviceId) {
    // Цей метод для публічного відображення, тому завжди тільки схвалені
    let sql = `
        SELECT r.ReviewID, r.UserID, u.Username AS UserName, 
               r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
        FROM Reviews r 
        JOIN Users u ON r.UserID = u.UserID
        WHERE r.ServiceID = ? AND r.IsApproved = 1`; // Завжди тільки схвалені (IsApproved = 1)
    sql += " ORDER BY r.ReviewDate DESC";
    const [rows] = await pool.query(sql, [serviceId]);
    // Конвертуємо IsApproved (хоча тут він завжди 1)
    return rows.map((review) => ({
      ...review,
      IsApproved: !!review.IsApproved,
    }));
  },

  async getByUserId(userId, isAdmin = false) {
    let sql = `
        SELECT r.ReviewID, r.UserID, u.Username AS UserName, r.ServiceID, s.ServiceName, 
               r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
        FROM Reviews r 
        JOIN Users u ON r.UserID = u.UserID 
        LEFT JOIN Services s ON r.ServiceID = s.ServiceID
        WHERE r.UserID = ?`;

    sql += " ORDER BY r.ReviewDate DESC";
    const [rows] = await pool.query(sql, [userId]);
    return rows.map((review) => ({
      ...review,
      IsApproved: !!review.IsApproved,
    }));
  },
};

module.exports = Review;
