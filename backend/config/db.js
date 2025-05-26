// backend/config/db.js
const mysql = require("mysql2/promise");
// Дуже важливо, щоб цей рядок був на самому початку і шлях був правильним
const path = require("path"); // Додайте це на початку файлу
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
