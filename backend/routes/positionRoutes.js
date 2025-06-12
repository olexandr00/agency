// backend/routes/positionRoutes.js
const express = require("express");
const router = express.Router();
const positionController = require("../controllers/positionController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// Для не адмінів
router.get("/", isAuthenticated, isAdmin, positionController.getAllPositions);
router.get(
  "/:id",
  isAuthenticated,
  isAdmin,
  positionController.getPositionById
);

// CRUD операції тільки для адмінів
router.post("/", isAuthenticated, isAdmin, positionController.createPosition);
router.put("/:id", isAuthenticated, isAdmin, positionController.updatePosition);
router.delete(
  "/:id",
  isAuthenticated,
  isAdmin,
  positionController.deletePosition
);

module.exports = router;
