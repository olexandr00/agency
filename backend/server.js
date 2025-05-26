// backend/server.js
require("dotenv").config({ path: "../.env" });

const app = require("./app");
const pool = require("./config/db"); // Імпортуємо пул для перевірки з'єднання

const PORT = process.env.PORT || 3000;

// Перевірка з'єднання з БД при старті
async function checkDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database.");
    connection.release();
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
    // Можна зупинити сервер, якщо БД недоступна
    // process.exit(1);
  }
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await checkDbConnection();
});
