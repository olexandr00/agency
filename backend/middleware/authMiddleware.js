// backend/middleware/authMiddleware.js
const { verifyToken } = require("../utils/jwtHelper");

const flexibleAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (decoded) {
      req.user = { userId: decoded.userId, role: decoded.role };
    }
  } else {
  }
  next(); // Завжди викликаємо next(), щоб запит йшов далі
};

const isAuthenticated = async (req, res, next) => {
  // Цей залишається строгим
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token required. Format: Bearer <token>",
    });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  req.user = { userId: decoded.userId, role: decoded.role };

  next();
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin role required." });
  }
};

module.exports = {
  isAuthenticated, // Строгий
  isAdmin,
  flexibleAuth, // Гнучкий
};
