// backend/app.js
const express = require("express");
const cors = require("cors");
const mainRouter = require("./routes/index"); // Головний роутер
const errorHandler = require("./middleware/errorHandler"); // Обробник помилок

const path = require("path");

const app = express();

// Middleware
app.use(cors()); // Дозволяє запити з інших доменів
app.use(express.json()); // Для парсингу JSON тіл запитів
app.use(express.urlencoded({ extended: true })); // Для парсингу URL-encoded тіл запитів;

// Обслуговування статичних файлів (завантажених зображень)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Головний роутер для API
app.use("/api", mainRouter);

// Middleware для обробки помилок
app.use(errorHandler);

module.exports = app;
