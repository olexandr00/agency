// backend/controllers/siteOrderController.js
const SiteOrder = require("../models/SiteOrder");
const Service = require("../models/Service");

const siteOrderController = {
  createSiteOrder: async (req, res, next) => {
    try {
      const userId = req.user ? req.user.userId : null;
      const {
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
        items, // масив об'єктів { serviceId, quantity }
      } = req.body;

      if (!customerName || !customerEmail || !customerPhone) {
        return res
          .status(400)
          .json({ message: "Ім'я, email та телефон клієнта є обов'язковими." });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ message: "Позиції замовлення (послуги) є обов'язковими." });
      }

      const servicesInOrder = [];
      for (const item of items) {
        if (!item.serviceId || !item.quantity || parseInt(item.quantity) <= 0) {
          return res.status(400).json({
            message:
              "Кожна позиція замовлення повинна мати дійсний ID послуги та додатню кількість.",
          });
        }
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res
            .status(400)
            .json({ message: `Послугу з ID ${item.serviceId} не знайдено.` });
        }
        servicesInOrder.push({
          serviceId: service.ServiceID, // Використовуємо ID з об'єкта послуги
          quantity: parseInt(item.quantity),
          priceAtOrder: parseFloat(service.BasePrice), // Ціна на момент замовлення
        });
      }

      const orderData = {
        customerName,
        customerEmail,
        customerPhone,
        customerNotes,
      };
      // Передаємо userId, який може бути null, якщо користувач не автентифікований
      const createdOrder = await SiteOrder.create(
        userId,
        orderData,
        servicesInOrder
      );

      res.status(201).json({
        message:
          "Замовлення успішно створено. Ми зв'яжемося з вами найближчим часом.",
        order: {
          orderId: createdOrder.OrderID,
          publicOrderId: createdOrder.PublicOrderID,
          totalAmount: createdOrder.TotalAmount,
          status: createdOrder.OrderStatus,
          orderDate: createdOrder.OrderDate,
        },
      });
    } catch (error) {
      console.error("[SiteOrderController.createSiteOrder] Помилка:", error);
      if (error.message && typeof error.message === "string") {
        if (error.message.toLowerCase().includes("not found")) {
          return res.status(400).json({
            message:
              "Помилка створення замовлення: зазначеного користувача або послугу не знайдено.",
          });
        }
        if (
          error.message
            .toLowerCase()
            .includes("cannot create an order with no services") ||
          error.message.includes("неможливо створити замовлення без послуг")
        ) {
          return res
            .status(400)
            .json({ message: "Неможливо створити замовлення без послуг." });
        }
        if (error.message.toLowerCase().includes("validation failed")) {
          return res.status(400).json({
            message: "Помилка валідації даних при створенні замовлення.",
          });
        }
      }
      next(error);
    }
  },

  getAllSiteOrders: async (req, res, next) => {
    // Доступно адміну для всіх замовлень, або користувачу для своїх
    try {
      const { search, status, userId: queryUserId } = req.query;
      let userIdFilter = null;

      // Якщо користувач не адмін, він бачить тільки свої замовлення
      if (req.user.role !== "admin") {
        userIdFilter = req.user.userId;
      } else if (queryUserId) {
        const parsedUserId = parseInt(queryUserId);
        if (!isNaN(parsedUserId) && parsedUserId > 0) {
          userIdFilter = parsedUserId;
        } else if (queryUserId) {
          return res.status(400).json({
            message: "Невірний формат ID користувача для фільтрації.",
          });
        }
      }

      const orders = await SiteOrder.getAll({
        searchTerm: search,
        userIdFilter: userIdFilter,
        statusFilter: req.user.role === "admin" && status ? status : null, // Фільтр статусу для адміна
      });
      res.status(200).json(orders);
    } catch (error) {
      console.error("[SiteOrderController.getAllSiteOrders] Помилка:", error);
      next(error);
    }
  },

  getSiteOrderById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const order = await SiteOrder.findById(id);

      if (!order) {
        return res.status(404).json({ message: "Замовлення не знайдено." });
      }

      if (
        req.user.role !== "admin" &&
        order.UserID &&
        order.UserID !== req.user.userId
      ) {
        return res.status(403).json({
          message:
            "Доступ заборонено. Ви можете переглядати лише власні замовлення.",
        });
      }

      if (req.user.role !== "admin" && !order.UserID) {
        return res
          .status(403)
          .json({ message: "Доступ до цього замовлення обмежено." });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(
        `[SiteOrderController.getSiteOrderById] Помилка для ID ${req.params.id}:`,
        error
      );
      next(error);
    }
  },

  updateSiteOrderStatus: async (req, res, next) => {
    // Доступно тільки адміну
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ message: "Новий статус замовлення є обов'язковим." });
      }

      const orderToUpdate = await SiteOrder.findById(id); // Знаходимо замовлення за будь-яким ID
      if (!orderToUpdate) {
        return res
          .status(404)
          .json({ message: "Замовлення для оновлення статусу не знайдено." });
      }

      const success = await SiteOrder.updateStatus(
        orderToUpdate.OrderID, // Оновлюємо за внутрішнім OrderID
        status
      );
      if (!success) {
        return res.status(400).json({
          message:
            "Не вдалося оновити статус замовлення. Можливо, вказано недійсний статус або замовлення не знайдено.",
        });
      }

      const updatedOrder = await SiteOrder.findById(orderToUpdate.OrderID);
      res.status(200).json({
        message: "Статус замовлення успішно оновлено.",
        order: updatedOrder,
      });
    } catch (error) {
      console.error(
        `[SiteOrderController.updateSiteOrderStatus] Помилка для ID ${req.params.id}:`,
        error
      );
      if (
        error.message &&
        typeof error.message === "string" &&
        (error.message.toLowerCase().includes("invalid order status") ||
          error.message.includes("недійсний статус замовлення"))
      ) {
        return res
          .status(400)
          .json({ message: "Вказано недійсний статус замовлення." });
      }
      next(error);
    }
  },

  deleteSiteOrder: async (req, res, next) => {
    // Доступно тільки адміну
    try {
      const { id } = req.params;
      const orderToDelete = await SiteOrder.findById(id);
      if (!orderToDelete) {
        return res
          .status(404)
          .json({ message: "Замовлення для видалення не знайдено." });
      }

      const success = await SiteOrder.delete(orderToDelete.OrderID); // Видаляємо за внутрішнім OrderID
      if (!success) {
        // Можливо, замовлення вже було видалено
        return res.status(404).json({
          message: "Замовлення не вдалося видалити або його вже було видалено.",
        });
      }
      res.status(200).json({ message: "Замовлення успішно видалено." });
    } catch (error) {
      console.error(
        `[SiteOrderController.deleteSiteOrder] Помилка для ID ${req.params.id}:`,
        error
      );
      next(error);
    }
  },
};

module.exports = siteOrderController;
