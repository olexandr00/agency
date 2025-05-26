// backend/models/Position.js
const pool = require("../config/db");

const Position = {
  async create({ positionName, positionDescription, basePositionRate }) {
    const sql =
      "INSERT INTO Positions (PositionName, PositionDescription, BasePositionRate) VALUES (?, ?, ?)";
    try {
      // BasePositionRate може бути NULL, тому обробляємо це
      const rate =
        basePositionRate !== undefined &&
        basePositionRate !== null &&
        basePositionRate !== ""
          ? parseFloat(basePositionRate)
          : null;
      const [result] = await pool.query(sql, [
        positionName,
        positionDescription,
        rate,
      ]);
      return {
        id: result.insertId,
        positionName,
        positionDescription,
        basePositionRate: rate,
      };
    } catch (error) {
      if (
        error.code === "ER_DUP_ENTRY" &&
        error.message.includes("PositionName")
      ) {
        throw new Error("Position with this name already exists.");
      }
      throw error;
    }
  },

  async getAll(searchTerm = "") {
    let sql = "SELECT * FROM Positions";
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
    const sql = "SELECT * FROM Positions WHERE PositionID = ?";
    const [rows] = await pool.query(sql, [positionId]);
    return rows[0];
  },

  async update(
    positionId,
    { positionName, positionDescription, basePositionRate }
  ) {
    const fieldsToUpdate = {};
    if (positionName !== undefined) fieldsToUpdate.PositionName = positionName;
    if (positionDescription !== undefined)
      fieldsToUpdate.PositionDescription = positionDescription;
    // Дозволяємо встановлювати NULL для BasePositionRate
    if (basePositionRate !== undefined) {
      fieldsToUpdate.BasePositionRate =
        basePositionRate !== null && basePositionRate !== ""
          ? parseFloat(basePositionRate)
          : null;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return { changedRows: 0, message: "No fields to update provided." };
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
        throw new Error("Another position with this name already exists.");
      }
      throw error;
    }
  },

  async delete(positionId) {
    // Перевірка, чи посада використовується працівниками
    const checkEmployeesSql =
      "SELECT 1 FROM Employees WHERE PositionID = ? LIMIT 1";
    const [employeeRows] = await pool.query(checkEmployeesSql, [positionId]);
    if (employeeRows.length > 0) {
      throw new Error(
        "Cannot delete position. It is currently assigned to one or more employees. Please reassign or remove employees from this position first."
      );
    }

    const sql = "DELETE FROM Positions WHERE PositionID = ?";
    const [result] = await pool.query(sql, [positionId]);
    return result.affectedRows > 0;
  },
};

module.exports = Position;
