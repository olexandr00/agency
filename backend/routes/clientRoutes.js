// backend/routes/clientRoutes.js
const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// Всі операції з клієнтами доступні тільки адміністраторам
router.use(isAuthenticated, isAdmin);

router.post("/", clientController.createClient);
router.get("/", clientController.getAllClients);
router.get("/:id", clientController.getClientById);
router.put("/:id", clientController.updateClient);
router.delete("/:id", clientController.deleteClient);

module.exports = router;
