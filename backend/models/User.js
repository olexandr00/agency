// backend/models/User.js
const pool = require("../config/db");
const { hashPassword } = require("../utils/hashPassword"); // Може знадобитися при оновленні пароля

const User = {
  async create(username, email, passwordHash, role = "user") {
    const sql =
      "INSERT INTO Users (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)";
    try {
      const [result] = await pool.query(sql, [
        username,
        email,
        passwordHash,
        role,
      ]);
      return { id: result.insertId, username, email, role };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("UQ_Username")) {
          throw new Error("Username already exists.");
        }
        if (error.message.includes("UQ_Email")) {
          throw new Error("Email already exists.");
        }
      }
      throw error;
    }
  },

  async findByEmail(email) {
    const sql = "SELECT * FROM Users WHERE Email = ?";
    const [rows] = await pool.query(sql, [email]);
    return rows[0];
  },

  async findByUsername(username) {
    const sql = "SELECT * FROM Users WHERE Username = ?";
    const [rows] = await pool.query(sql, [username]);
    return rows[0];
  },

  async findById(userId) {
    // Повертаємо без хешу пароля
    const sql =
      "SELECT UserID, Username, Email, Role, RegistrationDate FROM Users WHERE UserID = ?";
    const [rows] = await pool.query(sql, [userId]);
    return rows[0];
  },

  async getAll(searchTerm = "") {
    let sql =
      "SELECT UserID, Username, Email, Role, RegistrationDate FROM Users";
    const params = [];
    if (searchTerm) {
      sql += " WHERE Username LIKE ? OR Email LIKE ?";
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    sql += " ORDER BY Username";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async update(userId, userData) {
    // userData може містити: username, email, role, password
    // Якщо передано password, його потрібно хешувати
    const { username, email, role, password } = userData;

    const fieldsToUpdate = [];
    const values = [];

    if (username !== undefined) {
      fieldsToUpdate.push("Username = ?");
      values.push(username);
    }
    if (email !== undefined) {
      fieldsToUpdate.push("Email = ?");
      values.push(email);
    }
    if (role !== undefined) {
      fieldsToUpdate.push("Role = ?");
      values.push(role);
    }
    if (password !== undefined && password.length > 0) {
      const hashedPassword = await hashPassword(password);
      fieldsToUpdate.push("PasswordHash = ?");
      values.push(hashedPassword);
    }

    if (fieldsToUpdate.length === 0) {
      return { changedRows: 0, message: "No valid fields to update." };
    }

    values.push(userId);
    const sql = `UPDATE Users SET ${fieldsToUpdate.join(
      ", "
    )} WHERE UserID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      // result.affectedRows може бути 1, навіть якщо дані не змінились (якщо WHERE спрацював)
      // result.changedRows показує, чи дійсно дані були змінені
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("UQ_Username")) {
          throw new Error("Update failed. Username already exists.");
        }
        if (error.message.includes("UQ_Email")) {
          throw new Error("Update failed. Email already exists.");
        }
      }
      throw error;
    }
  },

  async delete(userId) {
    // Перевірка на залежності, якщо є (наприклад, Reviews, SiteOrders)
    // У вашій схемі:
    // - Reviews.UserID має ON DELETE CASCADE (видаляться разом з юзером)
    // - SiteOrders.UserID має ON DELETE RESTRICT (не дасть видалити юзера, якщо є замовлення)

    const checkSiteOrdersSql =
      "SELECT 1 FROM SiteOrders WHERE UserID = ? LIMIT 1";
    const [siteOrderRows] = await pool.query(checkSiteOrdersSql, [userId]);
    if (siteOrderRows.length > 0) {
      throw new Error(
        "Cannot delete user. This user has existing site orders. Please reassign or delete orders first."
      );
    }

    // Можна додати перевірку, чи не видаляє адмін сам себе, якщо це потрібно
    // if (currentUser.id === userId) { throw new Error("Admin cannot delete own account this way."); }

    const sql = "DELETE FROM Users WHERE UserID = ?";
    const [result] = await pool.query(sql, [userId]);
    return result.affectedRows > 0;
  },
};

module.exports = User;
