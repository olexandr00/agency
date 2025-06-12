// backend/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  const statusCode = err.statusCode || 500; // Якщо є код статусу помилки, використовуємо його
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
  });
}

module.exports = errorHandler;
