// backend/controllers/serviceController.js
const Service = require("../models/Service");

const serviceController = {
  createService: async (req, res, next) => {
    try {
      const { serviceName, serviceDescription, basePrice } = req.body;
      if (!serviceName || basePrice === undefined) {
        // basePrice може бути 0, тому перевіряємо на undefined
        return res
          .status(400)
          .json({ message: "Service name and base price are required." });
      }
      if (
        isNaN(parseFloat(basePrice)) ||
        !isFinite(basePrice) ||
        parseFloat(basePrice) < 0
      ) {
        return res
          .status(400)
          .json({ message: "Base price must be a non-negative number." });
      }

      const newService = await Service.create({
        serviceName,
        serviceDescription,
        basePrice: parseFloat(basePrice),
      });
      res
        .status(201)
        .json({ message: "Service created successfully", service: newService });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllServices: async (req, res, next) => {
    try {
      const { search } = req.query; // Для пошуку
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
        return res.status(404).json({ message: "Service not found." });
      }
      res.status(200).json(service);
    } catch (error) {
      next(error);
    }
  },

  updateService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { serviceName, serviceDescription, basePrice } = req.body;

      const updateData = {};
      if (serviceName !== undefined) updateData.serviceName = serviceName;
      if (serviceDescription !== undefined)
        updateData.serviceDescription = serviceDescription;
      if (basePrice !== undefined) {
        if (
          isNaN(parseFloat(basePrice)) ||
          !isFinite(basePrice) ||
          parseFloat(basePrice) < 0
        ) {
          return res
            .status(400)
            .json({ message: "Base price must be a non-negative number." });
        }
        updateData.basePrice = parseFloat(basePrice);
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const existingService = await Service.findById(id);
      if (!existingService) {
        return res.status(404).json({ message: "Service not found." });
      }

      const result = await Service.update(id, updateData);

      if (result.affectedRows === 0 && result.changedRows === 0) {
        // changedRows може бути 0, якщо дані ті самі
        // Можливо, послуги не існувало, або дані не змінилися.
        // findById вже перевіряє існування, тому тут, ймовірно, дані не змінилися.
        return res
          .status(200)
          .json({
            message: "Service data was not changed.",
            service: await Service.findById(id),
          });
      }

      const updatedService = await Service.findById(id);
      res
        .status(200)
        .json({
          message: "Service updated successfully",
          service: updatedService,
        });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteService: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingService = await Service.findById(id);
      if (!existingService) {
        return res.status(404).json({ message: "Service not found." });
      }

      const success = await Service.delete(id);
      if (!success) {
        // Це може статися, якщо сервіс був видалений іншим запитом між findById і delete,
        // або якщо спрацювали якісь непередбачені обмеження БД.
        return res
          .status(404)
          .json({
            message: "Service could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      // Помилки, пов'язані з обмеженнями зовнішнього ключа
      if (error.message.includes("Cannot delete service")) {
        return res.status(409).json({ message: error.message }); // 409 Conflict
      }
      next(error);
    }
  },
};

module.exports = serviceController;
