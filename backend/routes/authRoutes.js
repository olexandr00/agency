// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/authMiddleware"); // Для getMe

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", isAuthenticated, authController.getMe); // Приклад захищеного роуту

module.exports = router;
