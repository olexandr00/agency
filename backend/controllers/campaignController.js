// backend/controllers/campaignController.js
const Campaign = require("../models/Campaign");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const Service = require("../models/Service");

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
          .json({ message: "Назва кампанії та ID клієнта є обов'язковими." });
      }
      // Валідація ClientID
      const client = await Client.findById(clientId);
      if (!client) {
        return res
          .status(400)
          .json({ message: `Клієнта з ID ${clientId} не знайдено.` });
      }
      // Валідація ResponsibleEmployeeID (якщо вказано)
      if (responsibleEmployeeId) {
        const employee = await Employee.findById(responsibleEmployeeId); // findById з моделі Employee
        if (!employee || employee.DismissalDate) {
          // Перевіряємо чи не звільнений
          return res.status(400).json({
            message: `Активного працівника з ID ${responsibleEmployeeId} не знайдено або він звільнений.`,
          });
        }
      }
      // Валідація дат, бюджету, статусу
      const validStatuses = ["Planned", "Active", "Completed", "Cancelled"];
      if (campaignStatus && !validStatuses.includes(campaignStatus)) {
        return res.status(400).json({
          message: `Недійсний статус кампанії. Статус має бути одним із: ${validStatuses.join(
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
          message: "Бюджет кампанії має бути невід'ємним числом або null.",
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
        message: "Кампанію успішно створено",
        campaign: newCampaign,
      });
    } catch (error) {
      // Спроба перекласти загальні помилки від моделі/БД, якщо вони не були перехоплені раніше
      if (error.message && typeof error.message === "string") {
        if (
          error.message.toLowerCase().includes("not found") ||
          error.message.toLowerCase().includes("foreign key constraint failed")
        ) {
          return res.status(400).json({
            message:
              "Помилка: один із зазначених ID (клієнта, працівника) не знайдено або недійсний.",
          });
        }
        if (
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("validation failed")
        ) {
          return res.status(400).json({
            message:
              "Помилка: надані дані не пройшли валідацію або мають невірний формат.",
          });
        }
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
        return res.status(404).json({ message: "Кампанію не знайдено." });
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
            .json({ message: `Клієнта з ID ${clientId} не знайдено.` });
        updateData.clientId = parseInt(clientId);
      }
      if (responsibleEmployeeId !== undefined) {
        if (responsibleEmployeeId !== null) {
          const employee = await Employee.findById(responsibleEmployeeId);
          if (!employee || employee.DismissalDate)
            return res.status(400).json({
              message: `Активного працівника з ID ${responsibleEmployeeId} не знайдено або він звільнений.`,
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
            message: "Бюджет кампанії має бути невід'ємним числом або null.",
          });
        }
        updateData.campaignBudget = campaignBudget;
      }
      if (campaignStatus !== undefined) {
        const validStatuses = ["Planned", "Active", "Completed", "Cancelled"];
        if (!validStatuses.includes(campaignStatus))
          return res.status(400).json({
            message: `Недійсний статус кампанії. Статус має бути одним із: ${validStatuses.join(
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
          .json({ message: "Не надано даних для оновлення." });
      }

      const existingCampaign = await Campaign.findById(id);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Кампанію не знайдено." });
      }

      const result = await Campaign.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message: "Дані кампанії не було змінено.",
          campaign: await Campaign.findById(id),
        });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Кампанію не знайдено або оновлення не вдалося." });
      }

      const updatedCampaign = await Campaign.findById(id);
      res.status(200).json({
        message: "Кампанію успішно оновлено",
        campaign: updatedCampaign,
      });
    } catch (error) {
      if (error.message && typeof error.message === "string") {
        if (
          error.message.toLowerCase().includes("not found") ||
          error.message.toLowerCase().includes("foreign key constraint failed")
        ) {
          return res.status(400).json({
            message:
              "Помилка: один із зазначених ID (клієнта, працівника) не знайдено або недійсний.",
          });
        }
        if (
          error.message.toLowerCase().includes("invalid") ||
          error.message.toLowerCase().includes("validation failed")
        ) {
          return res.status(400).json({
            message:
              "Помилка: надані дані не пройшли валідацію або мають невірний формат.",
          });
        }
      }
      next(error);
    }
  },

  deleteCampaign: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingCampaign = await Campaign.findById(id);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Кампанію не знайдено." });
      }

      const success = await Campaign.delete(id);
      if (!success) {
        return res.status(404).json({
          message: "Кампанію не вдалося видалити або її вже було видалено.",
        });
      }
      res.status(200).json({
        message:
          "Кампанію та пов'язані з нею послуги/призначення успішно видалено",
      });
    } catch (error) {
      next(error);
    }
  },

  addServiceToCampaign: async (req, res, next) => {
    try {
      const { campaignId } = req.params;
      const { serviceId, quantity } = req.body;

      if (!serviceId || quantity === undefined) {
        return res
          .status(400)
          .json({ message: "ID послуги та кількість є обов'язковими." });
      }
      if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return res.status(400).json({
          message: "Кількість послуги має бути додатнім цілим числом.",
        });
      }

      const service = await Service.findById(serviceId);
      if (!service) {
        return res
          .status(400)
          .json({ message: `Послугу з ID ${serviceId} не знайдено.` });
      }

      const result = await Campaign.addServiceToCampaign(
        campaignId,
        parseInt(serviceId),
        parseInt(quantity)
      );
      res.status(201).json({
        message: "Послугу успішно додано до кампанії",
        data: result,
      });
    } catch (error) {
      let userMessage = "";
      let statusCode = 500;

      if (error.message && typeof error.message === "string") {
        if (error.message.toLowerCase().includes("already added")) {
          statusCode = 409;
          userMessage = `Послуга з ID ${serviceId} вже додана до кампанії ${campaignId}.`;
        } else if (error.message.toLowerCase().includes("not found")) {
          statusCode = 404;
          if (error.message.toLowerCase().includes("campaign")) {
            userMessage = `Кампанію з ID ${campaignId} не знайдено.`;
          } else if (error.message.toLowerCase().includes("service")) {
            userMessage = `Послугу з ID ${serviceId} не знайдено (можливо, помилка на рівні моделі кампанії).`;
          } else {
            userMessage =
              "Запитаний ресурс не знайдено під час додавання послуги до кампанії.";
          }
        }
      }

      if (userMessage) {
        return res.status(statusCode).json({ message: userMessage });
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
          .json({ message: "Кількість послуги є обов'язковою." });
      }
      if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        return res.status(400).json({
          message: "Кількість послуги має бути додатнім цілим числом.",
        });
      }

      const result = await Campaign.updateServiceInCampaign(
        campaignId,
        serviceId,
        parseInt(quantity)
      );
      res.status(200).json({
        message: "Кількість послуги в кампанії успішно оновлено",
        data: result,
      });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("not found")
      ) {
        let userMessage = "";
        if (
          error.message
            .toLowerCase()
            .includes(`campaign with id ${campaignid} not found`)
        ) {
          // Приклад більш точної перевірки
          userMessage = `Кампанію з ID ${campaignId} не знайдено.`;
        } else if (
          error.message
            .toLowerCase()
            .includes(`service with id ${serviceid} not found in campaign`)
        ) {
          // Приклад
          userMessage = `Послугу з ID ${serviceId} не знайдено в кампанії ${campaignId}.`;
        } else {
          userMessage = `Послугу або кампанію не знайдено, або послуга не належить цій кампанії. ID кампанії: ${campaignId}, ID послуги: ${serviceId}.`;
        }
        return res.status(404).json({ message: userMessage });
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
        // Модель повернула false, означає, що запис не знайдено для видалення
        return res.status(404).json({
          message: `Послугу з ID ${serviceId} не знайдено в кампанії ID ${campaignId} або її вже було видалено.`,
        });
      }
      res.status(200).json({ message: "Послугу успішно видалено з кампанії." });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = campaignController;
