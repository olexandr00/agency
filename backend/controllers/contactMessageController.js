// backend/controllers/contactMessageController.js
const ContactMessage = require("../models/ContactMessage");
// Можна додати відправку email адміну при отриманні нового повідомлення

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
        return res
          .status(400)
          .json({
            message: "Sender name, email, and message text are required.",
          });
      }
      // Валідація email (проста)
      if (!senderEmail.includes("@")) {
        return res
          .status(400)
          .json({ message: "Invalid sender email format." });
      }

      const newMessage = await ContactMessage.create({
        senderName,
        senderEmail,
        senderPhone,
        messageSubject,
        messageText,
      });

      // Опціонально: відправити email-сповіщення адміністратору
      // sendAdminNotification(newMessage);

      res.status(201).json({
        message: "Message sent successfully. We will get back to you soon.",
        messageData: { id: newMessage.id, senderName: newMessage.senderName },
      });
    } catch (error) {
      next(error);
    }
  },

  // Адмін отримує всі повідомлення (з фільтрацією)
  getAllMessages: async (req, res, next) => {
    try {
      const { search, isRead } = req.query;
      let isReadFilter = null;
      if (isRead !== undefined) {
        isReadFilter = isRead === "true" || isRead === "1";
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
        return res.status(404).json({ message: "Message not found." });
      }

      // Якщо повідомлення ще не прочитане і адмін його відкриває, позначити як прочитане
      if (!message.IsRead) {
        await ContactMessage.markAsRead(id, true);
        message.IsRead = 1; // Оновити об'єкт для відповіді
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
      const { read } = req.body; // boolean: true to mark as read, false as unread

      if (read === undefined) {
        return res
          .status(400)
          .json({ message: "Read status (read: true/false) is required." });
      }

      const message = await ContactMessage.findById(id); // Перевірка існування
      if (!message) {
        return res.status(404).json({ message: "Message not found." });
      }

      const success = await ContactMessage.markAsRead(id, !!read);
      if (!success) {
        return res
          .status(500)
          .json({ message: "Failed to update message read status." });
      }
      const updatedMessage = await ContactMessage.findById(id);
      res
        .status(200)
        .json({
          message: `Message marked as ${
            read ? "read" : "unread"
          } successfully.`,
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
        return res.status(404).json({ message: "Message not found." });
      }

      const success = await ContactMessage.delete(id);
      if (!success) {
        return res
          .status(404)
          .json({
            message: "Message could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "Message deleted successfully." });
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
