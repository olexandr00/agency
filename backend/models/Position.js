// backend/models/Position.js
const pool = require("../config/db");

const Position = {
  async create({ positionName, positionDescription, basePositionRate }) {
    const sql =
      "INSERT INTO Positions (PositionName, PositionDescription, BasePositionRate) VALUES (?, ?, ?)";
    try {
      const rate =
        basePositionRate === undefined ||
        basePositionRate === null ||
        String(basePositionRate).trim() === ""
          ? null
          : parseFloat(basePositionRate);

      if (rate !== null && isNaN(rate)) {
        // Якщо не null і не число, це помилка
        throw new Error(
          "Базова ставка посади (BasePositionRate) має бути числом або null."
        );
      }

      const [result] = await pool.query(sql, [
        positionName,
        positionDescription || null, // Дозволяємо null для опису
        rate,
      ]);
      return {
        id: result.insertId,
        positionName,
        positionDescription: positionDescription || null,
        basePositionRate: rate,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("PositionName")
      ) {
        // Унікальний індекс на PositionName
        throw new Error("Посада з такою назвою вже існує.");
      }
      console.error("Помилка при створенні посади в моделі:", error);
      throw error;
    }
  },

  async getAll(searchTerm = "") {
    let sql =
      "SELECT PositionID, PositionName, PositionDescription, BasePositionRate FROM Positions"; // Явно вказуємо поля
    const params = [];
    if (searchTerm) {
      sql += " WHERE PositionName LIKE ? OR PositionDescription LIKE ?";
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    sql += " ORDER BY PositionName";
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(positionId) {
    const sql =
      "SELECT PositionID, PositionName, PositionDescription, BasePositionRate FROM Positions WHERE PositionID = ?";
    const [rows] = await pool.query(sql, [positionId]);
    return rows.length > 0 ? rows[0] : null; // Повертаємо null, якщо не знайдено
  },

  async update(
    positionId,
    { positionName, positionDescription, basePositionRate }
  ) {
    const fieldsToUpdate = {};
    if (positionName !== undefined) fieldsToUpdate.PositionName = positionName;
    if (positionDescription !== undefined)
      fieldsToUpdate.PositionDescription = positionDescription; // Дозволяємо null

    if (basePositionRate !== undefined) {
      const rate =
        basePositionRate === null || String(basePositionRate).trim() === ""
          ? null
          : parseFloat(basePositionRate);
      if (rate !== null && isNaN(rate)) {
        throw new Error(
          "Базова ставка посади (BasePositionRate) має бути числом або null."
        );
      }
      fieldsToUpdate.BasePositionRate = rate;
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
    values.push(positionId);

    const sql = `UPDATE Positions SET ${setClause} WHERE PositionID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("PositionName")
      ) {
        throw new Error("Інша посада з такою назвою вже існує.");
      }
      console.error("Помилка при оновленні посади в моделі:", error);
      throw error;
    }
  },

  async delete(positionId) {
    const sql = "DELETE FROM Positions WHERE PositionID = ?";
    try {
      const [result] = await pool.query(sql, [positionId]);
      return result.affectedRows > 0; // Повертає true, якщо було видалено, false - якщо ні
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new Error(
          "Неможливо видалити посаду, оскільки вона призначена працівникам. Спочатку змініть або видаліть посаду у відповідних працівників."
        );
      }
      console.error("Помилка при видаленні посади в моделі:", error);
      throw error;
    }
  },
};

module.exports = Position;
