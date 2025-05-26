// backend/utils/jwtHelper.js
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "../../.env" });

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Токен дійсний 1 день, можна налаштувати
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null; // Якщо токен невалідний або прострочений
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
