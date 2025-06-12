// backend/models/Client.js
const pool = require("../config/db");

const Client = {
  async create({
    clientCompanyName,
    contactPersonLastName,
    contactPersonFirstName,
    contactPersonMiddleName,
    contactPersonPhone,
    contactPersonEmail,
    cooperationStartDate,
  }) {
    const sql = `INSERT INTO Clients 
                 (ClientCompanyName, ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, ContactPersonPhone, ContactPersonEmail, CooperationStartDate) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.query(sql, [
        clientCompanyName || null,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName || null,
        contactPersonPhone,
        contactPersonEmail || null,
        cooperationStartDate,
      ]);
      return {
        id: result.insertId, // Повертаємо ID створеного клієнта
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonPhone,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        // Унікальні індекси на телефон та email
        if (error.message.includes("ContactPersonPhone"))
          // Припускаємо, що індекс називається так або містить це поле
          throw new Error(
            "Клієнт з таким контактним номером телефону вже існує."
          );
        if (error.message.includes("ContactPersonEmail"))
          // Припускаємо, що індекс називається так або містить це поле
          throw new Error(
            "Клієнт з такою контактною електронною поштою вже існує."
          );
        // Якщо є інші унікальні поля, додати їх обробку
        throw new Error("Клієнт з такими даними вже існує.");
      }
      throw error; // Перекидаємо інші помилки
    }
  },

  async getAll(searchTerm = "") {
    let sql = `
      SELECT 
        ClientID, ClientCompanyName, 
        ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, 
        ContactPersonPhone, ContactPersonEmail, CooperationStartDate 
      FROM Clients
    `;
    const params = [];
    if (searchTerm) {
      sql += ` WHERE ClientCompanyName LIKE ? 
               OR ContactPersonLastName LIKE ? 
               OR ContactPersonFirstName LIKE ? 
               OR ContactPersonPhone LIKE ? 
               OR ContactPersonEmail LIKE ?`;
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }
    sql +=
      " ORDER BY COALESCE(ClientCompanyName, ''), ContactPersonLastName, ContactPersonFirstName"; // Сортування з урахуванням можливого NULL в ClientCompanyName
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findById(clientId) {
    const sql = `
      SELECT 
        ClientID, ClientCompanyName, 
        ContactPersonLastName, ContactPersonFirstName, ContactPersonMiddleName, 
        ContactPersonPhone, ContactPersonEmail, CooperationStartDate 
      FROM Clients 
      WHERE ClientID = ?
    `;
    const [rows] = await pool.query(sql, [clientId]);
    return rows.length > 0 ? rows[0] : null; // Повертаємо null, якщо не знайдено
  },

  async update(clientId, data) {
    const {
      clientCompanyName,
      contactPersonLastName,
      contactPersonFirstName,
      contactPersonMiddleName,
      contactPersonPhone,
      contactPersonEmail,
      cooperationStartDate,
    } = data;

    const fieldsToUpdate = {};
    if (clientCompanyName !== undefined)
      fieldsToUpdate.ClientCompanyName = clientCompanyName; // Дозволяємо null
    if (contactPersonLastName !== undefined)
      fieldsToUpdate.ContactPersonLastName = contactPersonLastName;
    if (contactPersonFirstName !== undefined)
      fieldsToUpdate.ContactPersonFirstName = contactPersonFirstName;
    if (contactPersonMiddleName !== undefined)
      fieldsToUpdate.ContactPersonMiddleName = contactPersonMiddleName; // Дозволяємо null
    if (contactPersonPhone !== undefined)
      fieldsToUpdate.ContactPersonPhone = contactPersonPhone;
    if (contactPersonEmail !== undefined)
      fieldsToUpdate.ContactPersonEmail = contactPersonEmail; // Дозволяємо null
    if (cooperationStartDate !== undefined)
      fieldsToUpdate.CooperationStartDate = cooperationStartDate;

    if (Object.keys(fieldsToUpdate).length === 0) {
      // Повертаємо об'єкт, схожий на результат запиту, щоб контролер міг це обробити
      return {
        affectedRows: 1,
        changedRows: 0,
        message: "Дані для оновлення не надано.",
      };
    }

    const fieldEntries = Object.entries(fieldsToUpdate);
    const setClause = fieldEntries.map(([key, _]) => `${key} = ?`).join(", ");
    const values = fieldEntries.map(([_, value]) => value);
    values.push(clientId);

    const sql = `UPDATE Clients SET ${setClause} WHERE ClientID = ?`;

    try {
      const [result] = await pool.query(sql, values);
      return {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("ContactPersonPhone"))
          throw new Error(
            "Оновлення не вдалося. Клієнт з таким контактним номером телефону вже існує."
          );
        if (error.message.includes("ContactPersonEmail"))
          throw new Error(
            "Оновлення не вдалося. Клієнт з такою контактною електронною поштою вже існує."
          );
        throw new Error(
          "Оновлення не вдалося. Клієнт з такими даними вже існує."
        );
      }
      throw error;
    }
  },

  async delete(clientId) {
    const sql = "DELETE FROM Clients WHERE ClientID = ?";
    try {
      const [result] = await pool.query(sql, [clientId]);
      return result.affectedRows > 0; // Повертає true, якщо було видалено, false - якщо ні (не знайдено)
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        // Помилка виникає, якщо є зовнішній ключ, що посилається на цього клієнта (наприклад, з таблиці Campaigns)
        throw new Error(
          "Неможливо видалити клієнта, оскільки він пов'язаний з рекламними кампаніями. Спочатку видаліть або перепризначте відповідні кампанії."
        );
      }
      throw error; // Перекидаємо інші помилки
    }
  },
};

module.exports = Client;
