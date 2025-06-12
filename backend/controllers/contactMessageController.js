// backend/controllers/contactMessageController.js
const ContactMessage = require("../models/ContactMessage");

const contactMessageController = {
  // Будь-який користувач може відправити повідомлення
  createMessage: async (req, res, next) => {
    try {
      const {
        senderName,
        senderEmail,
        senderPhone,
        messageSubject,
        messageText,
      } = req.body;

      if (!senderName || !senderEmail || !messageText) {
        return res.status(400).json({
          message:
            "Ім'я відправника, email та текст повідомлення є обов'язковими.",
        });
      }
      // Валідація email (проста)
      if (!senderEmail.includes("@") || !senderEmail.includes(".")) {
        // Трохи покращена перевірка
        return res
          .status(400)
          .json({ message: "Невірний формат email відправника." });
      }

      const newMessage = await ContactMessage.create({
        senderName,
        senderEmail,
        senderPhone,
        messageSubject,
        messageText,
      });

      res.status(201).json({
        message:
          "Повідомлення успішно надіслано. Ми зв'яжемося з вами найближчим часом.",
        messageData: { senderName: newMessage.senderName },
      });
    } catch (error) {
      // Можлива обробка специфічних помилок від моделі, якщо вони є
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

  // Адмін отримує всі повідомлення (з фільтрацією)
  getAllMessages: async (req, res, next) => {
    try {
      const { search, isRead } = req.query;
      let isReadFilter = null;
      if (isRead !== undefined) {
        if (isRead === "true" || isRead === "1") {
          isReadFilter = true;
        } else if (isRead === "false" || isRead === "0") {
          isReadFilter = false;
        }
      }

      const messages = await ContactMessage.getAll({
        searchTerm: search,
        isReadFilter: isReadFilter,
      });
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  },

  // Адмін отримує конкретне повідомлення за ID
  getMessageById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const message = await ContactMessage.findById(id);

      if (!message) {
        return res.status(404).json({ message: "Повідомлення не знайдено." });
      }

      // Якщо повідомлення ще не прочитане і адмін його відкриває, позначити як прочитане
      // Припускаємо, що IsRead в базі даних це TINYINT(1), тому 0 або 1.
      if (message.IsRead === 0 || message.IsRead === false) {
        await ContactMessage.markAsRead(id, true);
        message.IsRead = 1; // Оновити об'єкт для відповіді (в моделі IsRead це булеве значення або 0/1)
      }

      res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  },

  // Адмін позначає повідомлення як прочитане/непрочитане
  markMessageAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { read } = req.body; // очікуємо true або false

      if (typeof read !== "boolean") {
        // більш строга перевірка
        return res.status(400).json({
          message:
            "Статус прочитання (read: true/false) є обов'язковим і має бути булевим значенням.",
        });
      }

      const message = await ContactMessage.findById(id); // Перевірка існування
      if (!message) {
        return res.status(404).json({ message: "Повідомлення не знайдено." });
      }

      const success = await ContactMessage.markAsRead(id, read); // передаємо булеве значення
      if (!success) {
        return res
          .status(500) // Або 404, якщо модель повернула false через "не знайдено"
          .json({
            message: "Не вдалося оновити статус прочитання повідомлення.",
          });
      }
      const updatedMessage = await ContactMessage.findById(id);
      res.status(200).json({
        message: `Повідомлення успішно позначено як ${
          read ? "прочитане" : "непрочитане"
        }.`,
        contactMessage: updatedMessage,
      });
    } catch (error) {
      next(error);
    }
  },

  // Адмін видаляє повідомлення
  deleteMessage: async (req, res, next) => {
    try {
      const { id } = req.params;
      const message = await ContactMessage.findById(id); // Перевірка існування
      if (!message) {
        return res.status(404).json({ message: "Повідомлення не знайдено." });
      }

      const success = await ContactMessage.delete(id);
      if (!success) {
        // Модель повинна повертати true при успіху, false при невдачі (наприклад, вже видалено)
        return res.status(404).json({
          message:
            "Повідомлення не вдалося видалити або воно вже було видалене.",
        });
      }
      res.status(200).json({ message: "Повідомлення успішно видалено." });
    } catch (error) {
      next(error);
    }
  },

  // Адмін отримує кількість непрочитаних повідомлень (для дашборду)
  getUnreadMessagesCount: async (req, res, next) => {
    try {
      const count = await ContactMessage.getUnreadCount();
      res.status(200).json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = contactMessageController;
