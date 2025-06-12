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
const campaignRoutes = require("./campaignRoutes");
const reviewRoutes = require("./reviewRoutes");
const contactMessageRoutes = require("./contactMessageRoutes");
const siteOrderRoutes = require("./siteOrderRoutes");

// Використання роутерів
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/services", serviceRoutes);
router.use("/positions", positionRoutes);
router.use("/employees", employeeRoutes);
router.use("/clients", clientRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/site-orders", siteOrderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/contact-messages", contactMessageRoutes);

// Обробка неіснуючих API маршрутів (404)
router.use((req, res, next) => {
  res.status(404).json({
    message: `Endpoint not found. Cannot ${req.method} ${req.originalUrl}`,
  });
});

module.exports = router;
