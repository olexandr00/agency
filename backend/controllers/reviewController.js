// backend/controllers/reviewController.js
const Review = require("../models/Review");
const Service = require("../models/Service");

const reviewController = {
  createReview: async (req, res, next) => {
    try {
      // Перевірка, чи користувач автентифікований для створення відгуку
      if (!req.user || !req.user.userId) {
        return res
          .status(401)
          .json({ message: "Для створення відгуку потрібна автентифікація." });
      }
      const userId = req.user.userId;
      const { serviceId, reviewText, rating } = req.body;

      if (!reviewText) {
        return res
          .status(400)
          .json({ message: "Текст відгуку є обов'язковим." });
      }
      if (
        rating !== undefined &&
        rating !== null &&
        (isNaN(parseInt(rating)) ||
          parseInt(rating) < 1 ||
          parseInt(rating) > 5)
      ) {
        return res
          .status(400)
          .json({ message: "Рейтинг має бути цілим числом від 1 до 5." });
      }
      if (serviceId) {
        const service = await Service.findById(serviceId);
        if (!service) {
          return res
            .status(400)
            .json({ message: `Послугу з ID ${serviceId} не знайдено.` });
        }
      }

      const newReview = await Review.create({
        userId,
        serviceId: serviceId ? parseInt(serviceId) : null,
        reviewText,
        rating:
          rating !== undefined && rating !== null ? parseInt(rating) : null,
        // Адмін може одразу схвалити, якщо isApproved передано, інакше 0 (на модерації)
        // Звичайний користувач завжди надсилає на модерацію (isApproved = 0)
        isApproved:
          req.user.role === "admin" && req.body.isApproved !== undefined
            ? !!req.body.isApproved // Конвертуємо в boolean, потім модель в 0/1
            : 0,
      });
      res.status(201).json({
        message:
          "Відгук успішно надіслано. Він буде розглянутий адміністратором.",
        review: newReview,
      });
    } catch (error) {
      // Якщо модель кидає помилку "not found" (наприклад, UserID не знайдено при створенні)
      if (error.message && typeof error.message === "string") {
        if (error.message.toLowerCase().includes("not found")) {
          // Це може бути помилка, що UserID або ServiceID (якщо перевіряється в моделі Review.create) не знайдено
          // Перекладаємо загальну помилку, оскільки точна причина "not found" залежить від реалізації моделі
          return res
            .status(400)
            .json({
              message:
                "Помилка створення відгуку: зазначеного користувача або послугу не знайдено.",
            });
        }
        if (error.message.toLowerCase().includes("validation failed")) {
          return res
            .status(400)
            .json({
              message: "Помилка валідації даних при створенні відгуку.",
            });
        }
      }
      next(error);
    }
  },

  getAllReviews: async (req, res, next) => {
    try {
      const isAdmin = !!(req.user && req.user.role === "admin");
      const { search, serviceId, userId, approved } = req.query;

      let approvedFilterForModel = null;

      if (approved !== undefined && approved !== "") {
        approvedFilterForModel =
          approved === "1" || String(approved).toLowerCase() === "true";
      }

      const reviews = await Review.getAll({
        isAdmin,
        searchTerm: search,
        serviceIdFilter: serviceId ? parseInt(serviceId) : null,
        // Фільтр за userId доступний тільки адміну
        userIdFilter: isAdmin && userId ? parseInt(userId) : null,
        approvedFilter: approvedFilterForModel,
      });
      res.status(200).json(reviews);
    } catch (error) {
      console.error("[API /reviews КОНТРОЛЕР] Помилка в getAllReviews:", error);
      next(error);
    }
  },

  getReviewById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);
      if (!review) {
        return res.status(404).json({ message: "Відгук не знайдено." });
      }
      res.status(200).json(review);
    } catch (error) {
      next(error);
    }
  },

  updateReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reviewText, rating, isApproved } = req.body;

      const reviewToUpdate = await Review.findById(id);
      if (!reviewToUpdate) {
        return res
          .status(404)
          .json({ message: "Відгук для оновлення не знайдено." });
      }

      // Перевірка прав: тільки адмін або автор відгуку може редагувати (якщо isApproved не змінюється)
      // Або тільки адмін може змінювати isApproved
      // Для простоти, припускаємо, що middleware авторизації вже виконав перевірку ролі для цього ендпоінту
      // Якщо потрібно більш гранулярний контроль:
      // if (req.user.role !== 'admin' && reviewToUpdate.UserID !== req.user.userId) {
      //     return res.status(403).json({ message: "У вас недостатньо прав для редагування цього відгуку." });
      // }
      // if (isApproved !== undefined && req.user.role !== 'admin') {
      //     return res.status(403).json({ message: "Тільки адміністратор може змінювати статус схвалення відгуку." });
      // }

      const updateData = {};
      if (reviewText !== undefined) updateData.reviewText = reviewText;
      if (rating !== undefined) {
        if (
          rating !== null && // Дозволяємо null для скидання рейтингу
          (isNaN(parseInt(rating)) ||
            parseInt(rating) < 1 ||
            parseInt(rating) > 5)
        ) {
          return res.status(400).json({
            message:
              "Рейтинг має бути цілим числом від 1 до 5, або null (для скидання).",
          });
        }
        updateData.rating = rating !== null ? parseInt(rating) : null;
      }

      // Тільки адмін може змінювати isApproved через цей загальний метод оновлення
      // Для зміни isApproved краще використовувати окремий метод approveReview
      if (isApproved !== undefined && req.user && req.user.role === "admin") {
        updateData.isApproved = !!isApproved; // Конвертуємо в boolean
      } else if (
        isApproved !== undefined &&
        req.user &&
        req.user.role !== "admin"
      ) {
        return res
          .status(403)
          .json({
            message: "Тільки адміністратор може змінювати статус схвалення.",
          });
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "Не надано даних для оновлення." });
      }

      const result = await Review.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res.status(200).json({
          message:
            "Дані відгуку не було змінено (нові значення співпадають зі старими).",
          review: await Review.findById(id),
        });
      }
      if (result.affectedRows === 0) {
        // Малоймовірно, якщо findById вище спрацював
        return res
          .status(404)
          .json({ message: "Відгук не знайдено або оновлення не вдалося." });
      }

      const updatedReview = await Review.findById(id);
      res.status(200).json({
        message: "Відгук успішно оновлено",
        review: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  },

  approveReview: async (req, res, next) => {
    // Цей метод призначений для адмінів
    try {
      const { id } = req.params;
      const { approve } = req.body; // очікуємо true або false

      if (typeof approve !== "boolean") {
        return res.status(400).json({
          message:
            "Статус схвалення (approve: true/false) є обов'язковим і має бути булевим значенням.",
        });
      }

      const review = await Review.findById(id);
      if (!review) {
        return res.status(404).json({ message: "Відгук не знайдено." });
      }

      const success = await Review.approve(id, approve); // Модель приймає boolean
      if (!success) {
        // Модель могла повернути false, якщо статус вже був таким самим, або ID не знайдено
        return res.status(500).json({
          // Або 400/404 залежно від логіки моделі
          message:
            "Не вдалося оновити статус схвалення відгуку. Можливо, відгук не існує або статус вже був таким самим.",
        });
      }
      const updatedReview = await Review.findById(id);
      res.status(200).json({
        message: `Відгук успішно ${approve ? "схвалено" : "відхилено"}.`,
        review: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const reviewToDelete = await Review.findById(id);

      if (!reviewToDelete) {
        return res
          .status(404)
          .json({ message: "Відгук для видалення не знайдено." });
      }

      // Перевірка прав: тільки адмін або автор відгуку може видаляти
      // if (req.user.role !== 'admin' && reviewToDelete.UserID !== req.user.userId) {
      //     return res.status(403).json({ message: "У вас недостатньо прав для видалення цього відгуку." });
      // }

      const success = await Review.delete(id);
      if (!success) {
        // Модель повертає true/false
        return res.status(404).json({
          // Або 500, якщо це несподівана помилка
          message: "Відгук не вдалося видалити або його вже було видалено.",
        });
      }
      res.status(200).json({ message: "Відгук успішно видалено" });
    } catch (error) {
      next(error);
    }
  },

  getServiceReviews: async (req, res, next) => {
    // Для публічного відображення відгуків по конкретній послузі (тільки схвалені)
    try {
      const { serviceId } = req.params;

      const service = await Service.findById(serviceId);
      if (!service) {
        return res
          .status(404)
          .json({ message: `Послугу з ID ${serviceId} не знайдено.` });
      }
      // Модель Review.getByServiceId повинна повертати тільки схвалені відгуки
      const reviews = await Review.getByServiceId(serviceId);
      res.status(200).json(reviews);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reviewController;
