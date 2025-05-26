// backend/controllers/authController.js
const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const { generateToken } = require("../utils/jwtHelper");

// Функція для валідації складності пароля на сервері
function validatePasswordServer(password) {
  const errors = [];
  const MIN_LENGTH = 8;

  if (!password || password.length < MIN_LENGTH) {
    // Додано перевірку на існування пароля
    errors.push(`Пароль має містити щонайменше ${MIN_LENGTH} символів.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Пароль має містити щонайменше одну малу літеру.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Пароль має містити щонайменше одну велику літеру.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Пароль має містити щонайменше одну цифру.");
  }
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) {
  //     errors.push("Пароль має містити щонайменше один спеціальний символ.");
  // }
  return errors;
}

const authController = {
  register: async (req, res, next) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({
            message: "Ім'я користувача, email та пароль є обов'язковими.",
          });
      }

      // Серверна валідація складності пароля
      const passwordValidationErrors = validatePasswordServer(password);
      if (passwordValidationErrors.length > 0) {
        return res.status(400).json({
          message: `Пароль не відповідає вимогам безпеки.`,
          errors: passwordValidationErrors, // Повертаємо масив помилок
        });
      }

      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res
          .status(409)
          .json({ message: "Користувач з таким email вже існує." });
      }
      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res
          .status(409)
          .json({ message: "Це ім'я користувача вже зайняте." });
      }

      const hashedPassword = await hashPassword(password);
      // При публічній реєстрації роль завжди 'user', якщо тільки не спеціальна логіка (якої тут немає)
      const userRole = "user";
      // const userRole = (role && req.user?.role === 'admin' && ['user', 'admin'].includes(role)) ? role : 'user'; // Для створення адміном

      const newUser = await User.create(
        username,
        email,
        hashedPassword,
        userRole
      );
      const token = generateToken(newUser.id, newUser.role);

      res.status(201).json({
        message: "Користувача успішно зареєстровано",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      // Модель User.create вже обробляє ER_DUP_ENTRY, але можна залишити для інших помилок
      if (
        error.message &&
        error.message.toLowerCase().includes("already exists")
      ) {
        return res.status(409).json({ message: error.message });
      }
      next(error); // Для інших непередбачених помилок
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email та пароль є обов'язковими." });
      }
      const user = await User.findByEmail(email);
      if (!user) {
        return res
          .status(401)
          .json({ message: "Невірні облікові дані. Користувача не знайдено." });
      }
      const isMatch = await comparePassword(password, user.PasswordHash);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Невірні облікові дані. Пароль невірний." });
      }
      const token = generateToken(user.UserID, user.Role);
      res.status(200).json({
        message: "Вхід успішний",
        token,
        user: {
          id: user.UserID,
          username: user.Username,
          email: user.Email,
          role: user.Role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getMe: async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Не автентифіковано" });
      }
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "Користувача не знайдено" });
      }
      res
        .status(200)
        .json({
          id: user.UserID,
          username: user.Username,
          email: user.Email,
          role: user.Role,
        });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
