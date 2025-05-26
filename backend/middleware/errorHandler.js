// backend/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack); // Логуємо помилку для дебагу

  const statusCode = err.statusCode || 500; // Якщо є код статусу помилки, використовуємо його
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    // Можна додати stack в режимі розробки
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = errorHandler;
