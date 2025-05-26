// backend/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const {
  isAuthenticated,
  isAdmin,
  flexibleAuth,
} = require("../middleware/authMiddleware"); // Додали flexibleAuth

// Для GET /api/employees:
// - Публічна частина робить запит без токена -> req.user буде undefined
// - Адмінка робить запит з токеном -> req.user буде встановлено (якщо токен валідний)
// Контролер employeeController.getAllEmployees вже має логіку для обробки обох випадків
router.get("/", flexibleAuth, employeeController.getAllEmployees);

// Інші маршрути залишаються зі строгою аутентифікацією та перевіркою адміна
router.post("/", isAuthenticated, isAdmin, employeeController.createEmployee);
// Для getEmployeeById, якщо деталі може бачити тільки адмін:
router.get(
  "/:id",
  isAuthenticated,
  isAdmin,
  employeeController.getEmployeeById
);
// Якщо деталі може бачити і авторизований користувач (наприклад, свої дані, хоча це не той випадок):
// router.get('/:id', isAuthenticated, employeeController.getEmployeeById);
router.put("/:id", isAuthenticated, isAdmin, employeeController.updateEmployee);
router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  employeeController.deleteEmployee
);

module.exports = router;
