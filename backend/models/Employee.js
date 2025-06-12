// backend/models/Employee.js
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

const projectRootForModel = path.resolve(__dirname, "..", "..");

const Employee = {
  async _checkPositionExists(positionId) {
    if (
      positionId === null ||
      positionId === undefined ||
      String(positionId).trim() === ""
    ) {
      return; // Дозволяємо null або порожній рядок для PositionID
    }
    const parsedPositionId = parseInt(positionId);
    if (isNaN(parsedPositionId)) {
      throw new Error(`ID посади (PositionID) має бути числом.`);
    }

    const [position] = await pool.query(
      "SELECT PositionID FROM Positions WHERE PositionID = ?",
      [parsedPositionId]
    );
    if (position.length === 0) {
      throw new Error(`Посаду з ID ${parsedPositionId} не знайдено.`);
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
    if (
      positionId !== null &&
      positionId !== undefined &&
      String(positionId).trim() !== ""
    ) {
      await this._checkPositionExists(positionId);
    }

    const sql = `INSERT INTO Employees 
                 (LastName, FirstName, MiddleName, PositionID, Phone, Email, HireDate, Salary, DismissalDate, PhotoURL) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        lastName,
        firstName,
        middleName || null,
        // Якщо positionId порожній рядок або null, встановлюємо null в БД
        positionId === null || String(positionId).trim() === ""
          ? null
          : parseInt(positionId),
        phone,
        email || null,
        hireDate, // Має бути валідним форматом дати або null
        salary === null || String(salary).trim() === ""
          ? null
          : parseFloat(salary), // Дозволяємо null для зарплати
        dismissalDate || null,
        photoURL || null,
      ]);
      const createdEmployee = await this.findById(result.insertId);
      return createdEmployee;
    } catch (error) {
      console.error("[MODEL Employee.create] Помилка БД:", error);
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("Phone"))
          // Назва унікального індексу для телефону
          throw new Error("Працівник з таким номером телефону вже існує.");
        if (error.message.includes("Email"))
          // Назва унікального індексу для email
          throw new Error("Працівник з такою електронною поштою вже існує.");
        throw new Error("Працівник з такими даними вже існує.");
      }
      // Обробка помилки зовнішнього ключа для PositionID
      if (
        error.code === "ER_NO_REFERENCED_ROW_2" &&
        error.message.includes("FOREIGN KEY (`PositionID`)")
      ) {
        throw new Error(`Недійсна посада. Посади з ID ${positionId} не існує.`);
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
    `; // LEFT JOIN на випадок, якщо PositionID у працівника NULL
    const params = [];
    const whereClauses = [];

    if (!includeDismissed) {
      whereClauses.push("e.DismissalDate IS NULL");
    }

    if (searchTerm) {
      let searchCondition = `(e.LastName LIKE ? OR e.FirstName LIKE ? OR e.Phone LIKE ? OR e.Email LIKE ? OR p.PositionName LIKE ?)`;
      whereClauses.push(searchCondition);
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    // Сортування: спочатку активні, потім звільнені; далі за прізвищем та ім'ям
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
    return rows.length > 0 ? rows[0] : null; // Повертаємо null, якщо не знайдено
  },

  async update(employeeId, dataFromController) {
    if (
      dataFromController.hasOwnProperty("positionId") &&
      dataFromController.positionId !== null &&
      dataFromController.positionId !== undefined &&
      String(dataFromController.positionId).trim() !== ""
    ) {
      await this._checkPositionExists(dataFromController.positionId);
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
      fieldsToSetInDB.HireDate = dataFromController.hireDate || null; // Дозволяємо null

    if (dataFromController.hasOwnProperty("salary")) {
      fieldsToSetInDB.Salary =
        dataFromController.salary === null ||
        String(dataFromController.salary).trim() === ""
          ? null
          : parseFloat(dataFromController.salary);
    }

    if (dataFromController.hasOwnProperty("dismissalDate"))
      fieldsToSetInDB.DismissalDate = dataFromController.dismissalDate || null; // Дозволяємо null
    if (dataFromController.hasOwnProperty("photoURL")) {
      fieldsToSetInDB.PhotoURL = dataFromController.photoURL; // Може бути URL або null
    }

    if (Object.keys(fieldsToSetInDB).length === 0) {
      return {
        affectedRows: 1,
        changedRows: 0,
        message: "Дані для оновлення не надано.",
      }; // affectedRows: 1, бо працівник існує
    }

    const fieldSetClauses = [];
    const values = [];
    for (const dbColumnKey in fieldsToSetInDB) {
      fieldSetClauses.push(`${dbColumnKey} = ?`);
      values.push(fieldsToSetInDB[dbColumnKey]);
    }
    values.push(employeeId); // Додаємо ID працівника в кінець для WHERE умови

    const sql = `UPDATE Employees SET ${fieldSetClauses.join(
      ", "
    )} WHERE EmployeeID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      console.error("[MODEL Employee.update] Помилка SQL ОНОВЛЕННЯ:", error);
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("Phone"))
          throw new Error(
            "Оновлення не вдалося. Працівник з таким номером телефону вже існує."
          );
        if (error.message.includes("Email"))
          throw new Error(
            "Оновлення не вдалося. Працівник з такою електронною поштою вже існує."
          );
        throw new Error(
          "Оновлення не вдалося. Працівник з такими даними вже існує."
        );
      }
      if (
        error.code === "ER_NO_REFERENCED_ROW_2" &&
        error.message.includes("FOREIGN KEY (`PositionID`)")
      ) {
        throw new Error(
          `Помилка оновлення. Недійсна посада. Посади з ID ${dataFromController.positionId} не існує.`
        );
      }
      throw error;
    }
  },

  deletePhotoFile: (photoUrlToDelete) => {
    if (
      photoUrlToDelete &&
      typeof photoUrlToDelete === "string" &&
      photoUrlToDelete.startsWith("/uploads/employees/")
    ) {
      // Визначаємо шлях до папки public відносно кореня проєкту
      const publicDirectoryPath = path.join(
        projectRootForModel,
        "backend",
        "public"
      );
      // Отримуємо відносний шлях файлу всередині папки public, видаляючи початковий слеш
      const relativePathInsidePublic = photoUrlToDelete.substring(1); // Видаляємо '/' на початку
      const absoluteFilePath = path.join(
        publicDirectoryPath,
        relativePathInsidePublic
      );

      if (fs.existsSync(absoluteFilePath)) {
        try {
          fs.unlinkSync(absoluteFilePath);
          return true;
        } catch (err) {
          console.error(
            "[Employee.deletePhotoFile] Помилка видалення файлу фото:",
            err.message,
            err
          );
          return false;
        }
      }
    }
    return false;
  },

  async delete(employeeId) {
    const employee = await this.findById(employeeId); // Отримуємо дані працівника для видалення фото

    // Перевірка на пов'язані кампанії (якщо працівник є відповідальним)
    const checkCampaignsResponsibleSql =
      "SELECT 1 FROM Campaigns WHERE ResponsibleEmployeeID = ? LIMIT 1";
    const [campaignRespRows] = await pool.query(checkCampaignsResponsibleSql, [
      employeeId,
    ]);
    if (campaignRespRows.length > 0) {
      throw new Error(
        "Неможливо видалити працівника. Цей працівник є відповідальним за одну або декілька рекламних кампаній. Будь ласка, спершу перепризначте відповідальність."
      );
    }

    // Якщо працівника знайдено і він має фото, видаляємо файл фото
    if (employee && employee.PhotoURL) {
      this.deletePhotoFile(employee.PhotoURL); // Не зупиняємо процес, навіть якщо фото не вдалося видалити
    }

    const sql = "DELETE FROM Employees WHERE EmployeeID = ?";
    try {
      const [result] = await pool.query(sql, [employeeId]);
      return result.affectedRows > 0; // Повертає true, якщо було видалено, false - якщо ні
    } catch (error) {
      // Обробка інших можливих помилок зовнішніх ключів, якщо такі є
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new Error(
          "Неможливо видалити працівника через наявність пов'язаних з ним записів в інших таблицях."
        );
      }
      throw error;
    }
  },
};
module.exports = Employee;
