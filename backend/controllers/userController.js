// backend/controllers/userController.js
const User = require("../models/User");
const { hashPassword } = require("../utils/hashPassword"); // Для створення юзера адміном

const userController = {
  // Адмін створює нового користувача (може відрізнятися від public register)
  createUser: async (req, res, next) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password || !role) {
        return res
          .status(400)
          .json({
            message: "Username, email, password, and role are required.",
          });
      }
      if (!["user", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ message: 'Invalid role. Must be "user" or "admin".' });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long." });
      }
      // Додаткова валідація email

      const hashedPassword = await hashPassword(password);
      const newUser = await User.create(username, email, hashedPassword, role);

      // Не повертаємо токен, бо це адмінська операція, а не логін
      res.status(201).json({
        message: "User created successfully by admin.",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
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
        return res.status(404).json({ message: "User not found." });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { username, email, role, password } = req.body;

      // Валідація: не дозволяти змінювати роль самому собі, якщо це не передбачено
      // або не дозволяти знімати останнього адміна
      // req.user.userId - ID поточного адміна
      if (
        Number(id) === Number(req.user.userId) &&
        role &&
        role !== req.user.role
      ) {
        // Перевірити, чи є інші адміни, якщо поточний адмін намагається змінити свою роль на 'user'
        if (req.user.role === "admin" && role === "user") {
          const allUsers = await User.getAll();
          const adminCount = allUsers.filter(
            (u) => u.Role === "admin" && u.UserID !== Number(id)
          ).length;
          if (adminCount === 0) {
            return res
              .status(403)
              .json({
                message: "Cannot change role. You are the last administrator.",
              });
          }
        }
        // Можна додати інші обмеження на зміну власного профілю адміном
      }

      if (role && !["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified." });
      }
      if (password && password.length > 0 && password.length < 6) {
        return res
          .status(400)
          .json({
            message: "New password must be at least 6 characters long.",
          });
      }

      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email; // Додати валідацію email
      if (role !== undefined) updateData.role = role;
      if (password !== undefined && password.length > 0)
        updateData.password = password;

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found." });
      }

      const result = await User.update(id, updateData);

      // if (result.affectedRows === 0) { // Це може бути 0, якщо ID не знайдено, але ми перевірили вище
      //   return res.status(404).json({ message: 'User not found or data not changed.' });
      // }
      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res
          .status(200)
          .json({
            message: "User data was not changed.",
            user: await User.findById(id),
          });
      }
      if (result.changedRows === 0 && result.affectedRows === 0) {
        // На випадок, якщо щось пішло не так
        return res.status(304).json({ message: "User data not modified." }); // Not Modified
      }

      const updatedUser = await User.findById(id);
      res
        .status(200)
        .json({ message: "User updated successfully.", user: updatedUser });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Заборона видалення самого себе
      if (Number(id) === Number(req.user.userId)) {
        return res
          .status(403)
          .json({
            message: "You cannot delete your own account via this endpoint.",
          });
      }

      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found." });
      }

      // Заборона видалення останнього адміністратора
      if (userToDelete.Role === "admin") {
        const allUsers = await User.getAll();
        const adminCount = allUsers.filter((u) => u.Role === "admin").length;
        if (adminCount <= 1) {
          return res
            .status(403)
            .json({ message: "Cannot delete the last administrator." });
        }
      }

      const success = await User.delete(id);
      if (!success) {
        // Можливо, користувач вже був видалений або виникла інша проблема
        return res
          .status(404)
          .json({
            message: "User could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      if (error.message.includes("Cannot delete user")) {
        // Помилка від моделі через залежності
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },
};

module.exports = userController;
