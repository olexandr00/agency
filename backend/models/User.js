// backend/models/User.js
const pool = require("../config/db");
const { hashPassword } = require("../utils/hashPassword"); // Для хешування пароля

const User = {
  async create(username, email, passwordHash, role = "user") {
    // RegistrationDate встановлюється автоматично базою даних (DEFAULT CURRENT_TIMESTAMP)
    const sql =
      "INSERT INTO Users (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)";
    try {
      const [result] = await pool.query(sql, [
        username,
        email,
        passwordHash, // Пароль вже хешований передається сюди з authController
        role,
      ]);
      // Повертаємо тільки ті дані, які безпечно показувати і які потрібні для відповіді
      return { id: result.insertId, username, email, role };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        // Припускаємо, що у вас є унікальні індекси UQ_Username та UQ_Email
        if (error.message.toLowerCase().includes("username")) {
          throw new Error("Користувач з таким іменем вже існує.");
        }
        if (error.message.toLowerCase().includes("email")) {
          throw new Error("Користувач з такою електронною поштою вже існує.");
        }
        throw new Error("Користувач з такими даними вже існує.");
      }
      console.error("Помилка при створенні користувача в моделі:", error);
      throw error;
    }
  },

  async findByEmail(email) {
    // Цей метод важливий для логіну, тому повертаємо всі поля, включаючи хеш пароля
    const sql =
      "SELECT UserID, Username, Email, PasswordHash, Role, RegistrationDate FROM Users WHERE Email = ?";
    const [rows] = await pool.query(sql, [email]);
    return rows.length > 0 ? rows[0] : null;
  },

  async findByUsername(username) {
    // Також може використовуватися для логіну або перевірки унікальності
    const sql =
      "SELECT UserID, Username, Email, PasswordHash, Role, RegistrationDate FROM Users WHERE Username = ?";
    const [rows] = await pool.query(sql, [username]);
    return rows.length > 0 ? rows[0] : null;
  },

  async findById(userId) {
    // Не повертаємо хеш пароля
    const sql =
      "SELECT UserID, Username, Email, Role, RegistrationDate FROM Users WHERE UserID = ?";
    const [rows] = await pool.query(sql, [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  async getAll(searchTerm = "") {
    // Для адмін-панелі, не повертаємо хеші паролів
    let sql =
      "SELECT UserID, Username, Email, Role, RegistrationDate FROM Users";
    const params = [];
    if (searchTerm) {
      sql += " WHERE Username LIKE ? OR Email LIKE ? OR Role LIKE ?"; // Додано пошук за роллю
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    sql += " ORDER BY Username";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async update(userId, userData) {
    d;
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
    if (password !== undefined && String(password).trim() !== "") {
      // Пароль оновлюється, тільки якщо передано не порожній
      const hashedPassword = await hashPassword(password);
      fieldsToUpdate.push("PasswordHash = ?");
      values.push(hashedPassword);
    }

    if (fieldsToUpdate.length === 0) {
      return {
        affectedRows: 1,
        changedRows: 0,
        message: "Дані для оновлення не надано.",
      }; // affectedRows: 1, бо користувач існує
    }

    values.push(userId); // Додаємо ID користувача в кінець для WHERE умови
    const sql = `UPDATE Users SET ${fieldsToUpdate.join(
      ", "
    )} WHERE UserID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.toLowerCase().includes("username")) {
          throw new Error(
            "Оновлення не вдалося. Користувач з таким іменем вже існує."
          );
        }
        if (error.message.toLowerCase().includes("email")) {
          throw new Error(
            "Оновлення не вдалося. Користувач з такою електронною поштою вже існує."
          );
        }
        throw new Error(
          "Оновлення не вдалося. Користувач з такими даними вже існує."
        );
      }
      console.error("Помилка при оновленні користувача в моделі:", error);
      throw error;
    }
  },

  async delete(userId) {
    const sql = "DELETE FROM Users WHERE UserID = ?";
    try {
      const [result] = await pool.query(sql, [userId]);
      return result.affectedRows > 0; // Повертає true, якщо було видалено, false - якщо ні
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new Error(
          "Неможливо видалити користувача, оскільки він має пов'язані записи (наприклад, замовлення). Будь ласка, спершу обробіть ці записи."
        );
      }
      console.error("Помилка при видаленні користувача в моделі:", error);
      throw error;
    }
  },
};

module.exports = User;
