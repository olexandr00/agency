// backend/models/Employee.js
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

// Визначаємо кореневу теку проєкту відносно поточного файлу
// Якщо Employee.js знаходиться в PROJECT_ROOT/backend/models/
const projectRootForModel = path.resolve(__dirname, "..", "..");

const Employee = {
  async _checkPositionExists(positionId) {
    if (!positionId && positionId !== 0) {
      throw new Error(`PositionID є обов'язковим для працівника.`);
    }
    const [position] = await pool.query(
      "SELECT PositionID FROM Positions WHERE PositionID = ?",
      [positionId]
    );
    if (position.length === 0) {
      throw new Error(`Посаду з ID ${positionId} не знайдено.`);
    }
  },

  async create({
    lastName,
    firstName,
    middleName,
    positionId,
    phone,
    email,
    hireDate,
    salary,
    dismissalDate,
    photoURL,
  }) {
    console.log(
      "[MODEL Create] Отримано positionId:",
      positionId,
      typeof positionId
    );
    await this._checkPositionExists(parseInt(positionId)); // Переконуємось, що це число

    const sql = `INSERT INTO Employees 
                 (LastName, FirstName, MiddleName, PositionID, Phone, Email, HireDate, Salary, DismissalDate, PhotoURL) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        lastName,
        firstName,
        middleName || null,
        parseInt(positionId),
        phone,
        email || null,
        hireDate,
        salary,
        dismissalDate || null,
        photoURL || null,
      ]);
      const createdEmployee = await this.findById(result.insertId);
      return createdEmployee;
    } catch (error) {
      console.error("[MODEL Create] Помилка БД:", error);
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("Phone"))
          throw new Error("Працівник з таким телефоном вже існує.");
        if (error.message.includes("Email"))
          throw new Error("Працівник з таким email вже існує.");
      }
      throw error;
    }
  },

  async getAll(searchTerm = "", { includeDismissed = false } = {}) {
    let sql = `
      SELECT 
        e.EmployeeID, e.LastName, e.FirstName, e.MiddleName, 
        e.PositionID, p.PositionName, 
        e.Phone, e.Email, e.HireDate, e.Salary, e.DismissalDate, e.PhotoURL 
      FROM Employees e
      LEFT JOIN Positions p ON e.PositionID = p.PositionID 
    `;
    const params = [];
    const whereClauses = [];

    if (!includeDismissed) {
      whereClauses.push("e.DismissalDate IS NULL");
    }

    if (searchTerm) {
      let searchCondition = `(e.LastName LIKE ? OR e.FirstName LIKE ? OR e.Email LIKE ? OR p.PositionName LIKE ?)`;
      whereClauses.push(searchCondition);
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql +=
      " ORDER BY CASE WHEN e.DismissalDate IS NULL THEN 0 ELSE 1 END, e.LastName, e.FirstName";
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (dbError) {
      console.error("[Employee.getAll MODEL] Помилка SQL:", dbError.message);
      throw dbError;
    }
  },

  async findById(employeeId) {
    const sql = `
        SELECT e.EmployeeID, e.LastName, e.FirstName, e.MiddleName, e.PositionID, p.PositionName, 
               e.Phone, e.Email, e.HireDate, e.Salary, e.DismissalDate, e.PhotoURL
        FROM Employees e
        LEFT JOIN Positions p ON e.PositionID = p.PositionID
        WHERE e.EmployeeID = ?`;
    const [rows] = await pool.query(sql, [employeeId]);
    return rows[0];
  },

  async update(employeeId, dataFromController) {
    console.log(
      `[MODEL Employee.update] для ID ${employeeId}. Отримано дані:`,
      dataFromController
    );

    if (
      dataFromController.hasOwnProperty("positionId") &&
      dataFromController.positionId !== null &&
      dataFromController.positionId !== undefined &&
      String(dataFromController.positionId).trim() !== ""
    ) {
      await this._checkPositionExists(parseInt(dataFromController.positionId));
    }

    const fieldsToSetInDB = {};
    if (dataFromController.hasOwnProperty("lastName"))
      fieldsToSetInDB.LastName = dataFromController.lastName;
    if (dataFromController.hasOwnProperty("firstName"))
      fieldsToSetInDB.FirstName = dataFromController.firstName;
    if (dataFromController.hasOwnProperty("middleName"))
      fieldsToSetInDB.MiddleName = dataFromController.middleName || null;
    if (dataFromController.hasOwnProperty("positionId")) {
      fieldsToSetInDB.PositionID =
        dataFromController.positionId === null ||
        String(dataFromController.positionId).trim() === ""
          ? null
          : parseInt(dataFromController.positionId);
    }
    if (dataFromController.hasOwnProperty("phone"))
      fieldsToSetInDB.Phone = dataFromController.phone;
    if (dataFromController.hasOwnProperty("email"))
      fieldsToSetInDB.Email = dataFromController.email || null;
    if (dataFromController.hasOwnProperty("hireDate"))
      fieldsToSetInDB.HireDate = dataFromController.hireDate || null;
    if (dataFromController.hasOwnProperty("salary")) {
      fieldsToSetInDB.Salary =
        dataFromController.salary === null ||
        String(dataFromController.salary).trim() === ""
          ? null
          : parseFloat(dataFromController.salary);
    }
    if (dataFromController.hasOwnProperty("dismissalDate"))
      fieldsToSetInDB.DismissalDate = dataFromController.dismissalDate || null;

    // Обробка photoURL: може бути новим URL, null (для видалення), або відсутнім (не змінювати)
    if (dataFromController.hasOwnProperty("photoURL")) {
      fieldsToSetInDB.PhotoURL = dataFromController.photoURL;
    }

    if (Object.keys(fieldsToSetInDB).length === 0) {
      console.log("[MODEL Employee.update] Немає полів для оновлення.");
      return {
        affectedRows: 0,
        changedRows: 0,
        message: "Немає полів для оновлення.",
      };
    }

    const fieldSetClauses = [];
    const values = [];
    for (const dbColumnKey in fieldsToSetInDB) {
      fieldSetClauses.push(`${dbColumnKey} = ?`);
      values.push(fieldsToSetInDB[dbColumnKey]);
    }
    values.push(employeeId);

    const sql = `UPDATE Employees SET ${fieldSetClauses.join(
      ", "
    )} WHERE EmployeeID = ?`;
    console.log("[MODEL Employee.update] Фінальний SQL для оновлення:", sql);
    console.log(
      "[MODEL Employee.update] Фінальні параметри для оновлення:",
      JSON.stringify(values)
    );

    try {
      const [result] = await pool.query(sql, values);
      console.log("[MODEL Employee.update] Результат SQL оновлення:", result);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      console.error("[MODEL Employee.update] Помилка SQL ОНОВЛЕННЯ:", error);
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("Phone"))
          throw new Error("Працівник з таким телефоном вже існує.");
        if (error.message.includes("Email"))
          throw new Error("Працівник з таким email вже існує.");
      }
      if (
        error.code === "ER_NO_REFERENCED_ROW_2" &&
        error.message.includes("FOREIGN KEY (`PositionID`)") // Уточнив перевірку
      ) {
        throw new Error(
          `Помилка оновлення. Невалідний PositionID. Посади не існує.`
        );
      }
      throw error;
    }
  },

  deletePhotoFile: (photoUrlToDelete) => {
    console.log(
      "[Employee.deletePhotoFile] Отримано photoUrlToDelete:",
      photoUrlToDelete
    );
    if (
      photoUrlToDelete &&
      typeof photoUrlToDelete === "string" &&
      photoUrlToDelete.startsWith("/uploads/employees/")
    ) {
      const publicDirectoryPath = path.join(
        projectRootForModel,
        "backend",
        "public"
      );
      const relativePathInsidePublic = photoUrlToDelete.substring(1);
      const absoluteFilePath = path.join(
        publicDirectoryPath,
        relativePathInsidePublic
      );

      console.log(
        "[Employee.deletePhotoFile] Сконструйовано абсолютний шлях для видалення:",
        absoluteFilePath
      );

      if (fs.existsSync(absoluteFilePath)) {
        console.log(
          "[Employee.deletePhotoFile] Файл ІСНУЄ за шляхом:",
          absoluteFilePath
        );
        try {
          fs.unlinkSync(absoluteFilePath);
          console.log(
            "[Employee.deletePhotoFile] Успішно видалено файл фото:",
            absoluteFilePath
          );
          return true;
        } catch (err) {
          console.error(
            "[Employee.deletePhotoFile] Помилка видалення файлу фото:",
            err.message,
            err
          );
          return false;
        }
      } else {
        console.warn(
          "[Employee.deletePhotoFile] Файл НЕ ЗНАЙДЕНО для видалення за шляхом:",
          absoluteFilePath
        );
      }
    } else {
      console.warn(
        "[Employee.deletePhotoFile] photoUrlToDelete не відповідає критеріям або невалідний. Значення:",
        photoUrlToDelete
      );
    }
    return false;
  },

  async delete(employeeId) {
    const employee = await this.findById(employeeId);
    if (employee && employee.PhotoURL) {
      console.log(
        `[Employee.delete] Спроба видалити фото ${employee.PhotoURL} для працівника ID ${employeeId}`
      );
      const photoDeleted = this.deletePhotoFile(employee.PhotoURL);
      if (photoDeleted) {
        console.log(
          `[Employee.delete] Фото ${employee.PhotoURL} успішно видалено.`
        );
      } else {
        console.warn(
          `[Employee.delete] НЕ вдалося видалити файл фото ${employee.PhotoURL} для працівника ID ${employeeId}, але запис з БД буде видалено.`
        );
      }
    }

    const checkCampaignsResponsibleSql =
      "SELECT 1 FROM Campaigns WHERE ResponsibleEmployeeID = ? LIMIT 1";
    const [campaignRespRows] = await pool.query(checkCampaignsResponsibleSql, [
      employeeId,
    ]);
    if (campaignRespRows.length > 0) {
      throw new Error(
        "Неможливо видалити працівника. Цей працівник відповідальний за одну або більше кампаній. Будь ласка, спершу перепризначте відповідальність."
      );
    }

    const sql = "DELETE FROM Employees WHERE EmployeeID = ?";
    const [result] = await pool.query(sql, [employeeId]);
    return result.affectedRows > 0;
  },
};
module.exports = Employee;
