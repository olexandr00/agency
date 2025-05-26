// backend/routes/campaignRoutes.js
const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

// Всі операції з кампаніями доступні тільки адміністраторам
router.use(isAuthenticated, isAdmin);

// CRUD для Campaigns
router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getAllCampaigns);
router.get("/:id", campaignController.getCampaignById);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);

// Маршрути для управління послугами в кампанії (Campaign_Services)
router.post("/:campaignId/services", campaignController.addServiceToCampaign);
router.put(
  "/:campaignId/services/:serviceId",
  campaignController.updateServiceInCampaign
); // Оновлення кількості
router.delete(
  "/:campaignId/services/:serviceId",
  campaignController.removeServiceFromCampaign
);

module.exports = router;
