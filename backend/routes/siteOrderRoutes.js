// backend/routes/siteOrderRoutes.js
const express = require("express");
const router = express.Router();
const siteOrderController = require("../controllers/siteOrderController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// Всі маршрути тут вимагають аутентифікації
router.use(isAuthenticated);

// Користувач створює нове замовлення
router.post("/", siteOrderController.createSiteOrder);

// Користувач отримує список своїх замовлень / Адмін отримує всі або фільтровані
router.get("/", siteOrderController.getAllSiteOrders);

// Користувач отримує своє замовлення за ID / Адмін отримує будь-яке замовлення за ID
// Параметр :id тепер може бути як OrderID, так і PublicOrderID
router.get("/:id", siteOrderController.getSiteOrderById);

// --- Маршрути тільки для адміністраторів ---
// Адмін оновлює статус замовлення
// Параметр :id тепер може бути як OrderID, так і PublicOrderID
router.patch("/:id/status", isAdmin, siteOrderController.updateSiteOrderStatus);
// Адмін видаляє замовлення
// Параметр :id тепер може бути як OrderID, так і PublicOrderID
router.delete("/:id", isAdmin, siteOrderController.deleteSiteOrder);

module.exports = router;
