// backend/controllers/positionController.js
const Position = require("../models/Position");

const positionController = {
  createPosition: async (req, res, next) => {
    try {
      const { positionName, positionDescription, basePositionRate } = req.body;
      if (!positionName) {
        return res
          .status(400)
          .json({ message: "Назва посади є обов'язковою." });
      }
      if (
        basePositionRate !== undefined &&
        basePositionRate !== null &&
        basePositionRate !== "" && // Дозволяємо порожній рядок як null
        (isNaN(parseFloat(basePositionRate)) ||
          parseFloat(basePositionRate) < 0)
      ) {
        return res.status(400).json({
          message:
            "Базова ставка посади має бути невід'ємним числом або залишена порожньою (для значення null).",
        });
      }

      const newPosition = await Position.create({
        positionName,
        positionDescription,
        basePositionRate:
          basePositionRate === "" || basePositionRate === null
            ? null
            : parseFloat(basePositionRate),
      });
      res.status(201).json({
        message: "Посаду успішно створено",
        position: newPosition,
      });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("already exists") ||
          error.message.includes("вже існує"))
      ) {
        return res
          .status(409)
          .json({ message: "Посада з такою назвою вже існує." });
      }
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("validation failed")
      ) {
        return res
          .status(400)
          .json({
            message: "Помилка валідації даних. Перевірте введені значення.",
          });
      }
      next(error);
    }
  },

  getAllPositions: async (req, res, next) => {
    try {
      const { search } = req.query;
      const positions = await Position.getAll(search);
      res.status(200).json(positions);
    } catch (error) {
      next(error);
    }
  },

  getPositionById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const position = await Position.findById(id);
      if (!position) {
        return res.status(404).json({ message: "Посаду не знайдено." });
      }
      res.status(200).json(position);
    } catch (error) {
      next(error);
    }
  },

  updatePosition: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { positionName, positionDescription, basePositionRate } = req.body;

      const updateData = {};
      if (positionName !== undefined) updateData.positionName = positionName;
      if (positionDescription !== undefined)
        updateData.positionDescription = positionDescription;

      if (basePositionRate !== undefined) {
        if (
          basePositionRate !== null &&
          basePositionRate !== "" &&
          (isNaN(parseFloat(basePositionRate)) ||
            parseFloat(basePositionRate) < 0)
        ) {
          return res.status(400).json({
            message:
              "Базова ставка посади має бути невід'ємним числом або залишена порожньою (для значення null).",
          });
        }
        updateData.basePositionRate =
          basePositionRate === "" || basePositionRate === null
            ? null
            : parseFloat(basePositionRate);
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "Не надано даних для оновлення." });
      }

      const existingPosition = await Position.findById(id);
      if (!existingPosition) {
        return res
          .status(404)
          .json({ message: "Посаду для оновлення не знайдено." });
      }

      const result = await Position.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message:
            "Дані посади не було змінено (нові значення співпадають зі старими).",
          position: await Position.findById(id), // Повертаємо актуальні дані
        });
      }
      // Цей блок може бути зайвим, якщо findById вище вже перевірив існування
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Посаду не знайдено або оновлення не вдалося." });
      }

      const updatedPosition = await Position.findById(id);
      res.status(200).json({
        message: "Дані посади успішно оновлено",
        position: updatedPosition,
      });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("already exists") ||
          error.message.includes("вже існує"))
      ) {
        return res
          .status(409)
          .json({ message: "Посада з такою назвою вже існує." });
      }
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("validation failed")
      ) {
        return res
          .status(400)
          .json({
            message:
              "Помилка валідації даних при оновленні. Перевірте введені значення.",
          });
      }
      next(error);
    }
  },

  deletePosition: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingPosition = await Position.findById(id);
      if (!existingPosition) {
        return res
          .status(404)
          .json({ message: "Посаду для видалення не знайдено." });
      }

      const success = await Position.delete(id); // Модель має повертати true/false або кидати помилку

      if (typeof success === "object" && success.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Посаду не вдалося видалити (можливо, вона вже була видалена).",
        });
      }
      if (typeof success === "boolean" && !success) {
        // Якщо модель повертає false через FK constraint, який вона сама обробляє
        return res
          .status(400) // або 409
          .json({
            message:
              "Посаду не вдалося видалити. Перевірте, чи немає пов'язаних з нею працівників.",
          });
      }

      res.status(200).json({ message: "Посаду успішно видалено" });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("cannot delete position") ||
          error.message.includes("неможливо видалити посаду"))
      ) {
        return res
          .status(409)
          .json({
            message:
              "Неможливо видалити посаду, оскільки до неї прив'язані працівники.",
          });
      }
      // Більш загальна помилка від БД про зовнішній ключ
      if (
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        (error.message &&
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("foreign key constraint fails"))
      ) {
        return res
          .status(409)
          .json({
            message:
              "Неможливо видалити посаду через наявність пов'язаних з нею працівників.",
          });
      }
      next(error);
    }
  },
};

module.exports = positionController;
