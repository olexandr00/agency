// backend/models/Review.js
const pool = require("../config/db");

const Review = {
  async create({ userId, serviceId, reviewText, rating, isApproved = 0 }) {
    try {
      const [userRows] = await pool.query(
        "SELECT 1 FROM Users WHERE UserID = ?",
        [userId]
      );
      if (userRows.length === 0) {
        throw new Error(`User with ID ${userId} not found.`);
      }

      if (serviceId !== null && serviceId !== undefined) {
        const [serviceRows] = await pool.query(
          "SELECT 1 FROM Services WHERE ServiceID = ?",
          [serviceId]
        );
        if (serviceRows.length === 0) {
          throw new Error(`Service with ID ${serviceId} not found.`);
        }
      } else {
        serviceId = null; // Явно встановлюємо null, якщо не передано
      }

      const sql = `INSERT INTO Reviews (UserID, ServiceID, ReviewText, Rating, IsApproved) 
                   VALUES (?, ?, ?, ?, ?)`;

      const [result] = await pool.query(sql, [
        userId,
        serviceId,
        reviewText,
        // Переконуємося, що рейтинг є числом або null
        rating !== undefined && rating !== null ? parseInt(rating) : null,
        isApproved ? 1 : 0, // Конвертуємо boolean в 0/1
      ]);
      // Повертаємо створений об'єкт з ID
      return this.findById(result.insertId);
    } catch (error) {
      // Обробка помилок зовнішніх ключів
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        if (
          error.message.includes("FK_Review_User") ||
          error.message.includes("UserID")
        )
          // Адаптуйте під назву вашого constraint
          throw new Error(`User with ID ${userId} not found (FK constraint).`);
        if (
          error.message.includes("FK_Review_Service") ||
          error.message.includes("ServiceID")
        )
          // Адаптуйте
          throw new Error(
            `Service with ID ${serviceId} not found (FK constraint).`
          );
      }
      throw error; // Перекидаємо інші помилки
    }
  },

  async getAll({
    isAdmin = false,
    searchTerm = "",
    serviceIdFilter = null,
    userIdFilter = null,
    approvedFilter = null,
  } = {}) {
    console.log("[Review.getAll MODEL] Called with params:", {
      isAdmin,
      searchTerm,
      serviceIdFilter,
      userIdFilter,
      approvedFilter,
    });

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
      // Якщо фільтр явно передано (true або false, з адмінки)
      console.log(
        "[Review.getAll MODEL] Applying EXPLICIT approvedFilter:",
        approvedFilter
      );
      whereClauses.push("r.IsApproved = ?");
      params.push(approvedFilter ? 1 : 0); // true -> 1, false -> 0
    } else {
      // Якщо approvedFilter НЕ передано (null/undefined)
      console.log(
        "[Review.getAll MODEL] approvedFilter is null/undefined. Checking isAdmin for default filtering."
      );
      if (!isAdmin) {
        // Для публічного перегляду (не адмін) показуємо тільки схвалені
        console.log(
          "[Review.getAll MODEL] Not admin OR public access without explicit filter: SHOWING ONLY IsApproved = 1"
        );
        whereClauses.push("r.IsApproved = 1");
      } else {
        // Для адміна, якщо approvedFilter не передано, значить "Всі статуси" - не додаємо умову по IsApproved
        console.log(
          "[Review.getAll MODEL] Is admin AND approvedFilter is null/undefined: Showing ALL statuses (no IsApproved clause added)."
        );
      }
    }

    if (searchTerm) {
      whereClauses.push(
        `(r.ReviewText LIKE ? OR u.Username LIKE ? OR s.ServiceName LIKE ?)`
      );
      const term = `%${searchTerm}%`;
      params.push(term, term, term);
    }
    if (
      serviceIdFilter !== null &&
      serviceIdFilter !== undefined &&
      serviceIdFilter !== ""
    ) {
      whereClauses.push("r.ServiceID = ?");
      params.push(parseInt(serviceIdFilter));
    }
    if (
      userIdFilter !== null &&
      userIdFilter !== undefined &&
      userIdFilter !== "" &&
      isAdmin
    ) {
      whereClauses.push("r.UserID = ?");
      params.push(parseInt(userIdFilter));
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY r.ReviewDate DESC";

    console.log("[Review.getAll MODEL] FINAL SQL:", sql);
    console.log("[Review.getAll MODEL] FINAL PARAMS:", JSON.stringify(params));

    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (dbError) {
      console.error("[Review.getAll MODEL] DATABASE ERROR:", dbError);
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
    // Для публічного перегляду окремого відгуку, можливо, теж потрібна перевірка IsApproved
    // Або доступ до цього методу має бути тільки для адмінів, як зараз у роутах.
    const [rows] = await pool.query(sql, [reviewId]);
    return rows[0];
  },

  async update(reviewId, data) {
    const { reviewText, rating, isApproved } = data;
    const fieldsToUpdate = {};

    if (reviewText !== undefined) fieldsToUpdate.ReviewText = reviewText;
    if (rating !== undefined)
      fieldsToUpdate.Rating = rating !== null ? parseInt(rating) : null;
    if (isApproved !== undefined)
      fieldsToUpdate.IsApproved = isApproved ? 1 : 0; // boolean -> 0/1

    if (Object.keys(fieldsToUpdate).length === 0) {
      return {
        affectedRows: 1,
        changedRows: 0,
        message: "No fields to update provided, but review found.",
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
    // Очікує boolean
    const sql = "UPDATE Reviews SET IsApproved = ? WHERE ReviewID = ?";
    const [result] = await pool.query(sql, [
      approveStatusBoolean ? 1 : 0,
      reviewId,
    ]); // Конвертує boolean в 0/1
    return result.affectedRows > 0;
  },

  async delete(reviewId) {
    const sql = "DELETE FROM Reviews WHERE ReviewID = ?";
    const [result] = await pool.query(sql, [reviewId]);
    return result.affectedRows > 0;
  },

  async getByServiceId(serviceId) {
    // isAdmin тут не потрібен, бо завжди показуємо схвалені
    let sql = `SELECT r.ReviewID, r.UserID, u.Username AS UserName, r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
               FROM Reviews r JOIN Users u ON r.UserID = u.UserID
               WHERE r.ServiceID = ? AND r.IsApproved = 1`; // Завжди тільки схвалені
    sql += " ORDER BY r.ReviewDate DESC";
    const [rows] = await pool.query(sql, [serviceId]);
    return rows;
  },

  async getByUserId(userId) {
    // Зазвичай для адміна або профілю користувача
    let sql = `SELECT r.ReviewID, r.UserID, u.Username AS UserName, r.ServiceID, s.ServiceName, 
                      r.ReviewText, r.Rating, r.ReviewDate, r.IsApproved
               FROM Reviews r 
               JOIN Users u ON r.UserID = u.UserID 
               LEFT JOIN Services s ON r.ServiceID = s.ServiceID
               WHERE r.UserID = ? ORDER BY r.ReviewDate DESC`;
    const [rows] = await pool.query(sql, [userId]);
    return rows;
  },
};

module.exports = Review;
