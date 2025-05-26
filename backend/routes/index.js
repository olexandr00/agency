// backend/routes/index.js
const express = require("express");
const router = express.Router();

// Підключення роутерів для різних частин API
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const serviceRoutes = require("./serviceRoutes");
const positionRoutes = require("./positionRoutes");
const employeeRoutes = require("./employeeRoutes");
const clientRoutes = require("./clientRoutes");
const campaignRoutes = require("./campaignRoutes"); // Буде створено const siteOrderRoutes = require('./siteOrderRoutes'); // Буде створено
const reviewRoutes = require("./reviewRoutes"); // Буде створено
const contactMessageRoutes = require("./contactMessageRoutes"); // Буде створено
const siteOrderRoutes = require("./siteOrderRoutes"); // <--- ПЕРЕВІРТЕ, ЩО ЦЕЙ РЯДОК Є І ВІН НЕ ЗАКОМЕНТОВАНИЙ

// Використання роутерів
router.use("/auth", authRoutes); // Маршрути для аутентифікації (/api/auth)
router.use("/users", userRoutes); // Маршрути для управління користувачами (/api/users)
router.use("/services", serviceRoutes); // Маршрути для управління послугами (/api/services)
router.use("/positions", positionRoutes);
router.use("/employees", employeeRoutes);
router.use("/clients", clientRoutes);
router.use("/campaigns", campaignRoutes); // Маршрути для управління кампаніями (/api/campaigns)
router.use("/site-orders", siteOrderRoutes); // Маршрути для замовлень з сайту (/api/site-orders)
router.use("/reviews", reviewRoutes); // Маршрути для відгуків (/api/reviews)
router.use("/contact-messages", contactMessageRoutes); // Маршрути для повідомлень з форми зв'язку (/api/contact-messages)

// Тестовий роут для перевірки "здоров'я" API
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Обробка неіснуючих API маршрутів (404)
// Цей middleware має бути після всіх визначених роутів
router.use((req, res, next) => {
  res.status(404).json({
    message: `Endpoint not found. Cannot ${req.method} ${req.originalUrl}`,
  });
});

module.exports = router;
