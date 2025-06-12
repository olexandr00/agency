// backend/controllers/userController.js
const User = require("../models/User");
const { hashPassword } = require("../utils/hashPassword"); // Для створення/оновлення пароля

const userController = {
  // Адмін створює нового користувача
  createUser: async (req, res, next) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password || !role) {
        return res.status(400).json({
          message: "Ім'я користувача, email, пароль та роль є обов'язковими.",
        });
      }
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          message: 'Недійсна роль. Роль має бути "user" або "admin".',
        });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Пароль повинен містити щонайменше 6 символів." });
      }
      // Додаткова валідація email (проста)
      if (!email.includes("@") || !email.includes(".")) {
        return res.status(400).json({ message: "Невірний формат email." });
      }

      const hashedPassword = await hashPassword(password);
      const newUser = await User.create(username, email, hashedPassword, role);

      // Не повертаємо токен, бо це адмінська операція, а не логін
      res.status(201).json({
        message: "Користувача успішно створено адміністратором.",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      if (error.message && typeof error.message === "string") {
        if (
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("вже існує")
        ) {
          return res
            .status(409)
            .json({ message: "Користувач з таким ім'ям або email вже існує." });
        }
        if (error.message.toLowerCase().includes("validation failed")) {
          return res.status(400).json({
            message: "Помилка валідації даних. Перевірте введені значення.",
          });
        }
      }
      next(error);
    }
  },

  getAllUsers: async (req, res, next) => {
    try {
      const { search } = req.query;
      const users = await User.getAll(search);
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },

  getUserById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "Користувача не знайдено." });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params; // ID користувача, якого оновлюють
      const { username, email, role, password } = req.body; // Дані для оновлення

      const userToUpdate = await User.findById(id);
      if (!userToUpdate) {
        return res
          .status(404)
          .json({ message: "Користувача для оновлення не знайдено." });
      }

      // Перевірка, чи не намагається адмін змінити роль єдиного адміна на 'user'
      if (role && role === "user" && userToUpdate.Role === "admin") {
        if (String(userToUpdate.UserID) === String(req.user.userId)) {
          // Якщо адмін змінює свою роль
          const allUsers = await User.getAll();
          const adminCount = allUsers.filter((u) => u.Role === "admin").length;
          if (adminCount <= 1) {
            return res.status(403).json({
              message: "Неможливо змінити роль. Ви єдиний адміністратор.",
            });
          }
        } else {
          // Якщо адмін змінює роль іншого адміна
          const allUsers = await User.getAll();
          // Перевіряємо, чи цей адмін, якого понижують, не є останнім, *крім* поточного адміна, що робить запит
          const otherAdminsCount = allUsers.filter(
            (u) =>
              u.Role === "admin" && String(u.UserID) !== String(req.user.userId)
          ).length;
          if (
            otherAdminsCount === 0 &&
            String(userToUpdate.UserID) === String(req.user.userId)
          ) {
          } else if (allUsers.filter((u) => u.Role === "admin").length <= 1) {
            return res.status(403).json({
              message: "Неможливо змінити роль єдиного адміністратора системи.",
            });
          }
        }
      }

      if (role && !["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Вказано недійсну роль." });
      }
      if (password && password.length > 0 && password.length < 8) {
        return res.status(400).json({
          message: "Новий пароль повинен містити щонайменше 8 символів.",
        });
      }
      if (email && (!email.includes("@") || !email.includes("."))) {
        return res
          .status(400)
          .json({ message: "Невірний формат нового email." });
      }

      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (password !== undefined && password.length > 0) {
        // Пароль оновлюється тільки якщо передано і він не порожній
        updateData.password = password;
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "Не надано даних для оновлення." });
      }

      const result = await User.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message:
            "Дані користувача не було змінено (нові значення співпадають зі старими).",
          user: await User.findById(id),
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Користувача не знайдено або оновлення не вдалося.",
        });
      }

      const updatedUser = await User.findById(id);
      res.status(200).json({
        message: "Дані користувача успішно оновлено.",
        user: updatedUser,
      });
    } catch (error) {
      if (error.message && typeof error.message === "string") {
        if (
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("вже існує")
        ) {
          return res
            .status(409)
            .json({ message: "Користувач з таким ім'ям або email вже існує." });
        }
        if (error.message.toLowerCase().includes("validation failed")) {
          return res
            .status(400)
            .json({ message: "Помилка валідації даних при оновленні." });
        }
      }
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params; // ID користувача, якого видаляють

      // Заборона видалення самого себе (поточного адміна)
      if (String(id) === String(req.user.userId)) {
        return res.status(403).json({
          message:
            "Ви не можете видалити власний обліковий запис через цей ендпоінт.",
        });
      }

      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        return res
          .status(404)
          .json({ message: "Користувача для видалення не знайдено." });
      }

      // Заборона видалення останнього адміністратора
      if (userToDelete.Role === "admin") {
        const allUsers = await User.getAll();
        const adminCount = allUsers.filter((u) => u.Role === "admin").length;
        if (adminCount <= 1) {
          return res.status(403).json({
            message: "Неможливо видалити єдиного адміністратора системи.",
          });
        }
      }

      const success = await User.delete(id);
      if (!success) {
        return res.status(404).json({
          message:
            "Користувача не вдалося видалити або його вже було видалено.",
        });
      }
      res.status(200).json({ message: "Користувача успішно видалено." });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("cannot delete user") ||
          error.message
            .toLowerCase()
            .includes("неможливо видалити користувача"))
      ) {
        return res.status(409).json({
          message:
            "Неможливо видалити користувача, оскільки він пов'язаний з іншими записами (наприклад, замовленнями або відгуками).",
        });
      }
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        (error.message &&
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("foreign key constraint fails"))
      ) {
        return res.status(409).json({
          message:
            "Неможливо видалити користувача через наявність пов'язаних даних.",
        });
      }
      next(error);
    }
  },
};

module.exports = userController;
