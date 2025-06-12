// backend/routes/serviceRoutes.js
const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// PUBLIC ROUTES (доступні для всіх, включаючи гостей)
router.get("/", serviceController.getAllServices); // Перегляд списку послуг (з можливістю пошуку)
router.get("/:id", serviceController.getServiceById); // Перегляд конкретної послуги

// ADMIN ROUTES (тільки для адміністраторів)

// Новий маршрут
router.patch(
  "/update-prices-batch",
  isAuthenticated,
  isAdmin,
  serviceController.updatePricesBatch // Новий метод в контролері
);

router.post("/", isAuthenticated, isAdmin, serviceController.createService); // Створення нової послуги
router.put("/:id", isAuthenticated, isAdmin, serviceController.updateService); // Оновлення послуги
router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  serviceController.deleteService
); // Видалення послуги

module.exports = router;
