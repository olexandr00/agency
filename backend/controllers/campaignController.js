// backend/controllers/campaignController.js
const Campaign = require("../models/Campaign");
const Client = require("../models/Client"); // Для перевірки існування клієнта
const Employee = require("../models/Employee"); // Для перевірки існування працівника
const Service = require("../models/Service"); // Для перевірки існування послуги

const campaignController = {
  createCampaign: async (req, res, next) => {
    try {
      const {
        campaignName,
        clientId,
        responsibleEmployeeId,
        startDate,
        endDate,
        campaignBudget,
        campaignStatus,
        campaignDescription,
      } = req.body;

      if (!campaignName || !clientId) {
        return res
          .status(400)
          .json({ message: "CampaignName and ClientID are required." });
      }
      // Валідація ClientID
      const client = await Client.findById(clientId);
      if (!client) {
        return res
          .status(400)
          .json({ message: `Client with ID ${clientId} not found.` });
      }
      // Валідація ResponsibleEmployeeID (якщо вказано)
      if (responsibleEmployeeId) {
        const employee = await Employee.findById(responsibleEmployeeId); // findById з моделі Employee
        if (!employee || employee.DismissalDate) {
          // Перевіряємо чи не звільнений
          return res.status(400).json({
            message: `Active employee with ID ${responsibleEmployeeId} not found or is dismissed.`,
          });
        }
      }
      // Валідація дат, бюджету, статусу
      const validStatuses = ["Planned", "Active", "Completed", "Cancelled"];
      if (campaignStatus && !validStatuses.includes(campaignStatus)) {
        return res.status(400).json({
          message: `Invalid campaign status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }
      if (
        campaignBudget !== undefined &&
        campaignBudget !== null &&
        (isNaN(parseFloat(campaignBudget)) || parseFloat(campaignBudget) < 0)
      ) {
        return res.status(400).json({
          message: "Campaign budget must be a non-negative number or null.",
        });
      }
      // ... інші валідації ...

      const newCampaign = await Campaign.create({
        campaignName,
        clientId: parseInt(clientId),
        responsibleEmployeeId: responsibleEmployeeId
          ? parseInt(responsibleEmployeeId)
          : null,
        startDate,
        endDate,
        campaignBudget,
        campaignStatus,
        campaignDescription,
      });
      res.status(201).json({
        message: "Campaign created successfully",
        campaign: newCampaign,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid")
      ) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllCampaigns: async (req, res, next) => {
    try {
      const { search, status, clientId, employeeId } = req.query;
      const filters = { status, clientId, employeeId };
      const campaigns = await Campaign.getAll(search, filters);
      res.status(200).json(campaigns);
    } catch (error) {
      next(error);
    }
  },

  getCampaignById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const campaign = await Campaign.findById(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found." });
      }
      res.status(200).json(campaign);
    } catch (error) {
      next(error);
    }
  },

  updateCampaign: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        campaignName,
        clientId,
        responsibleEmployeeId,
        startDate,
        endDate,
        campaignBudget,
        campaignStatus,
        campaignDescription,
      } = req.body;

      const updateData = {};
      if (campaignName !== undefined) updateData.campaignName = campaignName;
      if (clientId !== undefined) {
        const client = await Client.findById(clientId);
        if (!client)
          return res
            .status(400)
            .json({ message: `Client with ID ${clientId} not found.` });
        updateData.clientId = parseInt(clientId);
      }
      if (responsibleEmployeeId !== undefined) {
        // Дозволяємо null
        if (responsibleEmployeeId !== null) {
          const employee = await Employee.findById(responsibleEmployeeId);
          if (!employee || employee.DismissalDate)
            return res.status(400).json({
              message: `Active employee with ID ${responsibleEmployeeId} not found or is dismissed.`,
            });
        }
        updateData.responsibleEmployeeId = responsibleEmployeeId
          ? parseInt(responsibleEmployeeId)
          : null;
      }
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (campaignBudget !== undefined) {
        if (
          campaignBudget !== null &&
          (isNaN(parseFloat(campaignBudget)) || parseFloat(campaignBudget) < 0)
        ) {
          return res.status(400).json({
            message: "Campaign budget must be a non-negative number or null.",
          });
        }
        updateData.campaignBudget = campaignBudget;
      }
      if (campaignStatus !== undefined) {
        const validStatuses = ["Planned", "Active", "Completed", "Cancelled"];
        if (!validStatuses.includes(campaignStatus))
          return res.status(400).json({
            message: `Invalid campaign status. Must be one of: ${validStatuses.join(
              ", "
            )}`,
          });
        updateData.campaignStatus = campaignStatus;
      }
      if (campaignDescription !== undefined)
        updateData.campaignDescription = campaignDescription;

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const existingCampaign = await Campaign.findById(id);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found." });
      }

      const result = await Campaign.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message: "Campaign data was not changed.",
          campaign: await Campaign.findById(id),
        });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Campaign not found or update failed." });
      }

      const updatedCampaign = await Campaign.findById(id);
      res.status(200).json({
        message: "Campaign updated successfully",
        campaign: updatedCampaign,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid")
      ) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteCampaign: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingCampaign = await Campaign.findById(id); // findById з моделі Campaign
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found." });
      }

      const success = await Campaign.delete(id);
      if (!success) {
        return res.status(404).json({
          message: "Campaign could not be deleted or was already deleted.",
        });
      }
      res.status(200).json({
        message:
          "Campaign and its associated services/assignments deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // --- Контролери для Campaign_Services ---
  addServiceToCampaign: async (req, res, next) => {
    try {
      const { campaignId } = req.params;
      const { serviceId, quantity } = req.body;

      if (!serviceId || quantity === undefined) {
        return res
          .status(400)
          .json({ message: "ServiceID and ServiceQuantity are required." });
      }
      if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return res
          .status(400)
          .json({ message: "ServiceQuantity must be a positive integer." });
      }
      // Додаткова перевірка існування serviceId, хоча модель це робить
      const service = await Service.findById(serviceId);
      if (!service) {
        return res
          .status(400)
          .json({ message: `Service with ID ${serviceId} not found.` });
      }

      const result = await Campaign.addServiceToCampaign(
        campaignId,
        parseInt(serviceId),
        parseInt(quantity)
      );
      res.status(201).json({
        message: "Service added to campaign successfully",
        data: result,
      });
    } catch (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("already added")
      ) {
        return res
          .status(error.message.includes("not found") ? 404 : 409)
          .json({ message: error.message });
      }
      next(error);
    }
  },

  updateServiceInCampaign: async (req, res, next) => {
    try {
      const { campaignId, serviceId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined) {
        return res
          .status(400)
          .json({ message: "ServiceQuantity is required." });
      }
      if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return res
          .status(400)
          .json({ message: "ServiceQuantity must be a positive integer." });
      }

      const result = await Campaign.updateServiceInCampaign(
        campaignId,
        serviceId,
        parseInt(quantity)
      );
      res.status(200).json({
        message: "Service quantity in campaign updated successfully",
        data: result,
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  },

  removeServiceFromCampaign: async (req, res, next) => {
    try {
      const { campaignId, serviceId } = req.params;
      const success = await Campaign.removeServiceFromCampaign(
        campaignId,
        serviceId
      );
      if (!success) {
        return res.status(404).json({
          message: `Service ID ${serviceId} not found in campaign ID ${campaignId} or already removed.`,
        });
      }
      res
        .status(200)
        .json({ message: "Service removed from campaign successfully." });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = campaignController;
