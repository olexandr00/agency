// backend/controllers/serviceController.js
const Service = require("../models/Service");

const serviceController = {
  createService: async (req, res, next) => {
    try {
      let { serviceName, serviceDescription, basePrice } = req.body;

      // Обрізаємо пробіли та перевіряємо
      serviceName = serviceName ? String(serviceName).trim() : "";
      if (serviceDescription !== undefined && serviceDescription !== null) {
        serviceDescription = String(serviceDescription).trim();
        if (serviceDescription === "") serviceDescription = null; // Порожній рядок після trim -> null
      } else {
        serviceDescription = null; // Якщо не передано, то null
      }

      if (
        !serviceName ||
        basePrice === undefined ||
        basePrice === null ||
        String(basePrice).trim() === ""
      ) {
        return res.status(400).json({
          message:
            "Назва послуги (не може бути порожньою або тільки з пробілів) та базова ціна є обов'язковими.",
        });
      }

      const parsedBasePrice = parseFloat(basePrice);
      if (
        isNaN(parsedBasePrice) ||
        !isFinite(parsedBasePrice) ||
        parsedBasePrice < 0
      ) {
        return res
          .status(400)
          .json({ message: "Базова ціна має бути невід'ємним числом." });
      }

      const newService = await Service.create({
        serviceName, // Вже обрізаний
        serviceDescription, // Вже обрізаний або null
        basePrice: parsedBasePrice,
      });
      res
        .status(201)
        .json({ message: "Послугу успішно створено", service: newService });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("already exists") ||
          error.message.includes("вже існує"))
      ) {
        return res.status(409).json({ message: error.message }); // Повертаємо повідомлення з моделі
      }
      // Модель вже кидає специфічні помилки валідації, які можна просто передати далі
      if (
        error.message &&
        (error.message.includes("Назва послуги є обов'язковою") ||
          error.message.includes("Базова ціна (BasePrice) має бути"))
      ) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllServices: async (req, res, next) => {
    try {
      const { search } = req.query;
      const services = await Service.getAll(search);
      res.status(200).json(services);
    } catch (error) {
      next(error);
    }
  },

  getServiceById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const service = await Service.findById(id);
      if (!service) {
        return res.status(404).json({ message: "Послугу не знайдено." });
      }
      res.status(200).json(service);
    } catch (error) {
      next(error);
    }
  },

  updateService: async (req, res, next) => {
    try {
      const { id } = req.params;
      let { serviceName, serviceDescription, basePrice } = req.body;

      const updateData = {};

      if (serviceName !== undefined) {
        const trimmedServiceName = String(serviceName).trim();
        if (!trimmedServiceName) {
          return res.status(400).json({
            message:
              "Назва послуги не може бути порожньою або складатися лише з пробілів при оновленні.",
          });
        }
        updateData.serviceName = trimmedServiceName;
      }

      if (serviceDescription !== undefined) {
        if (serviceDescription === null) {
          updateData.serviceDescription = null;
        } else {
          const trimmedServiceDescription = String(serviceDescription).trim();
          updateData.serviceDescription =
            trimmedServiceDescription === "" ? null : trimmedServiceDescription;
        }
      }

      if (basePrice !== undefined) {
        if (basePrice === null || String(basePrice).trim() === "") {
          return res.status(400).json({
            message:
              "Базова ціна є обов'язковою і не може бути порожньою при оновленні.",
          });
        }
        const parsedBasePrice = parseFloat(basePrice);
        if (
          isNaN(parsedBasePrice) ||
          !isFinite(parsedBasePrice) ||
          parsedBasePrice < 0
        ) {
          return res
            .status(400)
            .json({ message: "Базова ціна має бути невід'ємним числом." });
        }
        updateData.basePrice = parsedBasePrice;
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "Не надано даних для оновлення." });
      }

      const existingService = await Service.findById(id);
      if (!existingService) {
        return res
          .status(404)
          .json({ message: "Послугу для оновлення не знайдено." });
      }

      const result = await Service.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message: "Дані послуги не було змінено.",
          service: await Service.findById(id),
        });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Послугу не знайдено або оновлення не вдалося." });
      }

      const updatedService = await Service.findById(id);
      res.status(200).json({
        message: "Дані послуги успішно оновлено",
        service: updatedService,
      });
    } catch (error) {
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("already exists") ||
          error.message.includes("вже існує"))
      ) {
        return res.status(409).json({ message: error.message });
      }
      if (
        error.message &&
        (error.message.includes("Назва послуги не може бути порожньою") ||
          error.message.includes("Базова ціна (BasePrice) має бути"))
      ) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingService = await Service.findById(id);
      if (!existingService) {
        return res
          .status(404)
          .json({ message: "Послугу для видалення не знайдено." });
      }
      await Service.delete(id); // Модель тепер кидає помилку, якщо не вдалося видалити через FK
      res.status(200).json({ message: "Послугу успішно видалено" });
    } catch (error) {
      // Обробка специфічної помилки від моделі про FK
      if (
        error.message &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("неможливо видалити послугу")
      ) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  updatePricesBatch: async (req, res, next) => {
    try {
      const { percentageChange } = req.body;

      if (
        percentageChange === undefined ||
        percentageChange === null ||
        String(percentageChange).trim() === ""
      ) {
        return res
          .status(400)
          .json({ message: "Необхідно вказати відсоток зміни ціни." });
      }

      const parsedPercentage = parseFloat(percentageChange);
      if (isNaN(parsedPercentage)) {
        return res
          .status(400)
          .json({ message: "Відсоток зміни має бути числом." });
      }

      const result = await Service.updateAllPricesByPercentage(
        parsedPercentage
      );

      res.status(200).json({
        message: `Ціни для ${result.changedRows} послуг (з ${result.affectedRows} оброблених) успішно оновлено на ${parsedPercentage}%.`,
        updatedCount: result.changedRows,
        affectedCount: result.affectedRows,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = serviceController;
