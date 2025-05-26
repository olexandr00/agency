// backend/controllers/siteOrderController.js
const SiteOrder = require("../models/SiteOrder");
const Service = require("../models/Service");

const siteOrderController = {
  createSiteOrder: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const {
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
        items,
      } = req.body;

      if (!customerName || !customerEmail || !customerPhone) {
        return res
          .status(400)
          .json({ message: "Customer name, email, and phone are required." });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ message: "Order items (services) are required." });
      }

      const servicesInOrder = [];
      for (const item of items) {
        if (!item.serviceId || !item.quantity || parseInt(item.quantity) <= 0) {
          return res
            .status(400)
            .json({
              message:
                "Each order item must have a valid serviceId and a positive quantity.",
            });
        }
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res
            .status(400)
            .json({ message: `Service with ID ${item.serviceId} not found.` });
        }
        servicesInOrder.push({
          serviceId: service.ServiceID,
          quantity: parseInt(item.quantity),
          priceAtOrder: parseFloat(service.BasePrice),
        });
      }

      const orderData = {
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
      };
      const createdOrder = await SiteOrder.create(
        userId,
        orderData,
        servicesInOrder
      );
      // createdOrder тепер повний об'єкт замовлення з усіма полями

      res.status(201).json({
        message: "Order created successfully. We will contact you shortly.",
        order: {
          // Повертаємо вибрані поля для клієнта
          orderId: createdOrder.OrderID, // Внутрішній ID (може бути корисним для деяких внутрішніх логів)
          publicOrderId: createdOrder.PublicOrderID, // Публічний номер замовлення
          totalAmount: createdOrder.TotalAmount,
          status: createdOrder.OrderStatus,
          orderDate: createdOrder.OrderDate, // Додаємо дату
        },
      });
    } catch (error) {
      console.error("[siteOrderController.createSiteOrder] Error:", error);
      if (
        error.message.includes("not found") ||
        error.message.includes("Cannot create an order with no services")
      ) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllSiteOrders: async (req, res, next) => {
    try {
      const { search, status, userId: queryUserId } = req.query;
      let userIdFilter = null;

      if (req.user.role !== "admin") {
        userIdFilter = req.user.userId;
      } else if (queryUserId) {
        const parsedUserId = parseInt(queryUserId);
        if (!isNaN(parsedUserId)) userIdFilter = parsedUserId;
      }

      const orders = await SiteOrder.getAll({
        searchTerm: search,
        userIdFilter: userIdFilter,
        statusFilter: req.user.role === "admin" && status ? status : null,
      });
      res.status(200).json(orders);
    } catch (error) {
      console.error("[siteOrderController.getAllSiteOrders] Error:", error);
      next(error);
    }
  },

  getSiteOrderById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const order = await SiteOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }

      if (req.user.role !== "admin" && order.UserID !== req.user.userId) {
        return res
          .status(403)
          .json({
            message: "Access denied. You can only view your own orders.",
          });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(
        `[siteOrderController.getSiteOrderById] Error for ID ${req.params.id}:`,
        error
      );
      next(error);
    }
  },

  updateSiteOrderStatus: async (req, res, next) => {
    try {
      const { id } = req.params; // Це може бути PublicOrderID або OrderID
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ message: "New order status is required." });
      }

      const orderToUpdate = await SiteOrder.findById(id); // Знаходимо замовлення за будь-яким ID
      if (!orderToUpdate) {
        return res.status(404).json({ message: "Order not found." });
      }

      const success = await SiteOrder.updateStatus(
        orderToUpdate.OrderID,
        status
      ); // Оновлюємо за внутрішнім OrderID
      if (!success) {
        return res
          .status(400)
          .json({
            message: "Failed to update order status or order not found.",
          });
      }
      // Повертаємо оновлене замовлення, знайдене за PublicOrderID для консистентності
      const updatedOrder = await SiteOrder.findById(
        orderToUpdate.PublicOrderID
      );
      res.status(200).json({
        message: "Order status updated successfully.",
        order: updatedOrder,
      });
    } catch (error) {
      console.error(
        `[siteOrderController.updateSiteOrderStatus] Error for ID ${req.params.id}:`,
        error
      );
      if (error.message.includes("Invalid order status")) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteSiteOrder: async (req, res, next) => {
    try {
      const { id } = req.params;
      const orderToDelete = await SiteOrder.findById(id);
      if (!orderToDelete) {
        return res.status(404).json({ message: "Order not found." });
      }
      const success = await SiteOrder.delete(orderToDelete.OrderID);
      if (!success) {
        return res
          .status(404)
          .json({
            message: "Order could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "Order deleted successfully." });
    } catch (error) {
      console.error(
        `[siteOrderController.deleteSiteOrder] Error for ID ${req.params.id}:`,
        error
      );
      next(error);
    }
  },
};

module.exports = siteOrderController;
