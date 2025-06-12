// backend/controllers/clientController.js
const Client = require("../models/Client");

const clientController = {
  createClient: async (req, res, next) => {
    try {
      const {
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      } = req.body;

      // Валідація обов'язкових полів
      if (
        !contactPersonLastName ||
        !contactPersonFirstName ||
        !contactPersonPhone ||
        !cooperationStartDate
      ) {
        return res.status(400).json({
          message:
            "Прізвище контактної особи, ім'я контактної особи, телефон контактної особи та дата початку співпраці є обов'язковими.",
        });
      }
      // Валідація формату дати
      if (
        cooperationStartDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(cooperationStartDate)
      ) {
        return res.status(400).json({
          message:
            "Невірний формат дати початку співпраці. Використовуйте РРРР-ММ-ДД.",
        });
      }
      // Валідація телефону, email (можна додати regex)

      const newClient = await Client.create({
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      });
      res
        .status(201)
        .json({ message: "Клієнта успішно створено", client: newClient });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("already exists")
      ) {
        // Припускаємо, що модель кидає помилку з таким текстом
        return res.status(409).json({
          message:
            "Клієнт з такими контактними даними (телефон або email) вже існує.",
        });
      }
      // Для інших помилок, які можуть прийти з моделі або БД
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("validation failed")
      ) {
        return res.status(400).json({
          message: "Помилка валідації даних. Перевірте введені значення.",
        });
      }
      next(error);
    }
  },

  getAllClients: async (req, res, next) => {
    try {
      const { search } = req.query;
      const clients = await Client.getAll(search);
      res.status(200).json(clients);
    } catch (error) {
      next(error);
    }
  },

  getClientById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({ message: "Клієнта не знайдено." });
      }
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  },

  updateClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      } = req.body;

      const updateData = {};
      if (clientCompanyName !== undefined)
        updateData.clientCompanyName = clientCompanyName;
      if (contactPersonLastName !== undefined)
        updateData.contactPersonLastName = contactPersonLastName;
      if (contactPersonFirstName !== undefined)
        updateData.contactPersonFirstName = contactPersonFirstName;
      if (contactPersonMiddleName !== undefined)
        updateData.contactPersonMiddleName = contactPersonMiddleName;
      if (contactPersonPhone !== undefined)
        updateData.contactPersonPhone = contactPersonPhone;
      if (contactPersonEmail !== undefined)
        updateData.contactPersonEmail = contactPersonEmail;
      if (cooperationStartDate !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cooperationStartDate))
          return res.status(400).json({
            message:
              "Невірний формат дати початку співпраці. Використовуйте РРРР-ММ-ДД.",
          });
        updateData.cooperationStartDate = cooperationStartDate;
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "Не надано даних для оновлення." });
      }

      const existingClient = await Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Клієнта не знайдено." });
      }

      const result = await Client.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message: "Дані клієнта не було змінено.",
          client: await Client.findById(id), // Повертаємо актуальні дані
        });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Клієнта не знайдено або оновлення не вдалося." });
      }

      const updatedClient = await Client.findById(id);
      res.status(200).json({
        message: "Дані клієнта успішно оновлено",
        client: updatedClient,
      });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("already exists")
      ) {
        // Припускаємо, що модель кидає помилку з таким текстом
        return res.status(409).json({
          message:
            "Клієнт з такими оновленими контактними даними (телефон або email) вже існує.",
        });
      }
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("validation failed")
      ) {
        return res.status(400).json({
          message:
            "Помилка валідації даних при оновленні. Перевірте введені значення.",
        });
      }
      next(error);
    }
  },

  deleteClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingClient = await Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Клієнта не знайдено." });
      }

      const success = await Client.delete(id);

      if (typeof success === "object" && success.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Клієнта не вдалося видалити (можливо, він вже був видалений або існують пов'язані записи).",
        });
      }
      if (typeof success === "boolean" && !success) {
        return res.status(400).json({
          message:
            "Клієнта не вдалося видалити. Перевірте, чи немає пов'язаних з ним кампаній.",
        });
      }

      res.status(200).json({ message: "Клієнта успішно видалено" });
    } catch (error) {
      // Приклад обробки помилки від моделі, якщо вона кидає специфічну помилку
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message
          .toLowerCase()
          .includes("cannot delete client with active campaigns")
      ) {
        return res.status(409).json({
          message:
            "Неможливо видалити клієнта, оскільки він має активні рекламні кампанії.",
        });
      }
      // Більш загальна помилка, якщо модель просто кидає помилку при наявності зв'язків
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        (error.message &&
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("foreign key constraint fails"))
      ) {
        return res.status(409).json({
          message:
            "Неможливо видалити клієнта, оскільки існують пов'язані з ним записи (наприклад, рекламні кампанії).",
        });
      }
      next(error);
    }
  },
};

module.exports = clientController;
