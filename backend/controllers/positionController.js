// backend/controllers/positionController.js
const Position = require("../models/Position");

const positionController = {
  createPosition: async (req, res, next) => {
    try {
      const { positionName, positionDescription, basePositionRate } = req.body;
      if (!positionName) {
        return res.status(400).json({ message: "Position name is required." });
      }
      if (
        basePositionRate !== undefined &&
        basePositionRate !== null &&
        basePositionRate !== "" &&
        (isNaN(parseFloat(basePositionRate)) ||
          parseFloat(basePositionRate) < 0)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Base position rate must be a non-negative number or null.",
          });
      }

      const newPosition = await Position.create({
        positionName,
        positionDescription,
        basePositionRate,
      });
      res
        .status(201)
        .json({
          message: "Position created successfully",
          position: newPosition,
        });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
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
        return res.status(404).json({ message: "Position not found." });
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
        // Дозволяємо оновлювати на null
        if (
          basePositionRate !== null &&
          basePositionRate !== "" &&
          (isNaN(parseFloat(basePositionRate)) ||
            parseFloat(basePositionRate) < 0)
        ) {
          return res
            .status(400)
            .json({
              message:
                "Base position rate must be a non-negative number or null.",
            });
        }
        updateData.basePositionRate = basePositionRate;
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const existingPosition = await Position.findById(id);
      if (!existingPosition) {
        return res.status(404).json({ message: "Position not found." });
      }

      const result = await Position.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res
          .status(200)
          .json({
            message: "Position data was not changed.",
            position: await Position.findById(id),
          });
      }
      if (result.affectedRows === 0) {
        // Якщо affectedRows 0, значить ID не знайдено (хоча ми перевіряли)
        return res
          .status(404)
          .json({ message: "Position not found or update failed." });
      }

      const updatedPosition = await Position.findById(id);
      res
        .status(200)
        .json({
          message: "Position updated successfully",
          position: updatedPosition,
        });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  deletePosition: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingPosition = await Position.findById(id);
      if (!existingPosition) {
        return res.status(404).json({ message: "Position not found." });
      }

      const success = await Position.delete(id);
      if (!success) {
        return res
          .status(404)
          .json({
            message: "Position could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "Position deleted successfully" });
    } catch (error) {
      if (error.message.includes("Cannot delete position")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },
};

module.exports = positionController;
