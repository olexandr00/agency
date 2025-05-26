// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// Всі маршрути тут вимагають аутентифікації та ролі адміністратора
router.use(isAuthenticated, isAdmin);

router.post("/", userController.createUser); // Створити нового користувача (адмін)
router.get("/", userController.getAllUsers); // Отримати список всіх користувачів (з пошуком)
router.get("/:id", userController.getUserById); // Отримати користувача за ID
router.put("/:id", userController.updateUser); // Оновити дані користувача
router.delete("/:id", userController.deleteUser); // Видалити користувача

module.exports = router;
