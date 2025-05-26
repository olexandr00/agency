// backend/routes/contactMessageRoutes.js
const express = require("express");
const router = express.Router();
const contactMessageController = require("../controllers/contactMessageController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// --- Публічний маршрут ---
// Будь-який користувач (гість або авторизований) може відправити повідомлення
router.post("/", contactMessageController.createMessage);

// --- Маршрути тільки для адміністраторів ---
// Адмін отримує всі повідомлення (з можливістю фільтрації)
router.get(
  "/",
  isAuthenticated,
  isAdmin,
  contactMessageController.getAllMessages
);

// Адмін отримує кількість непрочитаних повідомлень
router.get(
  "/unread-count",
  isAuthenticated,
  isAdmin,
  contactMessageController.getUnreadMessagesCount
);

// Адмін отримує конкретне повідомлення за ID (і позначає його як прочитане)
router.get(
  "/:id",
  isAuthenticated,
  isAdmin,
  contactMessageController.getMessageById
);

// Адмін позначає повідомлення як прочитане/непрочитане
router.patch(
  "/:id/read",
  isAuthenticated,
  isAdmin,
  contactMessageController.markMessageAsRead
);

// Адмін видаляє повідомлення
router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  contactMessageController.deleteMessage
);

module.exports = router;
