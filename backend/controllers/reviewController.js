// backend/controllers/reviewController.js
const Review = require("../models/Review");
const Service = require("../models/Service"); // Якщо потрібно для інших методів

const reviewController = {
  createReview: async (req, res, next) => {
    try {
      // Важливо: Перевірка, чи користувач автентифікований для створення відгуку
      if (!req.user || !req.user.userId) {
        return res
          .status(401)
          .json({ message: "Authentication required to create a review." });
      }
      const userId = req.user.userId;
      const { serviceId, reviewText, rating } = req.body;

      if (!reviewText) {
        return res.status(400).json({ message: "Review text is required." });
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
          .json({ message: "Rating must be an integer between 1 and 5." });
      }
      if (serviceId) {
        // Опціонально: перевірка існування сервісу, якщо модель не робить цього
        const service = await Service.findById(serviceId);
        if (!service) {
          return res
            .status(400)
            .json({ message: `Service with ID ${serviceId} not found.` });
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
          "Review submitted successfully. It will be reviewed by an administrator.",
        review: newReview,
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        // Помилка від моделі, якщо User/Service не знайдено
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllReviews: async (req, res, next) => {
    try {
      // isAdmin тепер коректно визначиться: true, якщо req.user є і role='admin', інакше false
      const isAdmin = !!(req.user && req.user.role === "admin");
      const { search, serviceId, userId, approved } = req.query;

      let approvedFilterForModel = null; // null означає "не застосовувати явний фільтр"

      // Якщо параметр 'approved' передано (наприклад, з адмінки 'approved=1' або 'approved=0')
      if (approved !== undefined && approved !== "") {
        approvedFilterForModel =
          approved === "1" || String(approved).toLowerCase() === "true";
      }
      // Якщо 'approved' не передано, approvedFilterForModel залишається null.
      // Модель Review.getAll сама вирішить, що робити (показати тільки схвалені для не-адмінів, або всі для адмінів)

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
      console.error("[API /reviews CONTROLLER] Error in getAllReviews:", error);
      next(error);
    }
  },

  // ... решта методів контролера (getReviewById, updateReview, approveReview, deleteReview, getServiceReviews) ...
  // Вони не потребують змін, якщо їхня логіка вже правильна щодо використання isAuthenticated та isAdmin.

  getReviewById: async (req, res, next) => {
    try {
      const { id } = req.params;
      // Поточна модель findById не фільтрує за IsApproved, тому доступ до цього ендпоінту краще залишити адмінам,
      // як це налаштовано у reviewRoutes.js (isAuthenticated, isAdmin).
      // Якщо потрібно зробити його публічним, модель findById має враховувати isAdmin.
      const review = await Review.findById(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found." });
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

      // Перевірка, чи відгук існує (опціонально, модель може це робити)
      const reviewToUpdate = await Review.findById(id);
      if (!reviewToUpdate) {
        return res.status(404).json({ message: "Review not found." });
      }

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
            message: "Rating must be an integer between 1 and 5, or null.",
          });
        }
        updateData.rating = rating !== null ? parseInt(rating) : null;
      }
      // isApproved обробляється тільки якщо передано
      if (isApproved !== undefined) {
        updateData.isApproved = !!isApproved; // Конвертуємо в boolean
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const result = await Review.update(id, updateData); // Модель має конвертувати boolean isApproved в 0/1

      // Перевірка результату оновлення
      if (result.changedRows === 0 && result.affectedRows > 0) {
        // Рядок знайдено, але дані не змінилися (надіслали ті ж самі значення)
        return res.status(200).json({
          message: "Review data was not changed.",
          review: await Review.findById(id), // Повертаємо поточний стан
        });
      }
      if (result.affectedRows === 0) {
        // Рядок не знайдено (малоймовірно, якщо перевірка reviewToUpdate була)
        return res
          .status(404)
          .json({ message: "Review not found or update failed." });
      }

      const updatedReview = await Review.findById(id);
      res.status(200).json({
        message: "Review updated successfully",
        review: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  },

  approveReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { approve } = req.body; // Очікуємо { "approve": true } або { "approve": false }

      if (approve === undefined) {
        return res.status(400).json({
          message: "Approval status (approve: true/false) is required.",
        });
      }

      const review = await Review.findById(id); // Перевірка існування
      if (!review) {
        return res.status(404).json({ message: "Review not found." });
      }

      const success = await Review.approve(id, !!approve); // Передаємо boolean
      if (!success) {
        // Модель повернула false (affectedRows === 0)
        return res.status(500).json({
          message:
            "Failed to update review approval status. Review may not exist or status was already the same.",
        });
      }
      const updatedReview = await Review.findById(id);
      res.status(200).json({
        message: `Review ${approve ? "approved" : "unapproved"} successfully.`,
        review: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteReview: async (req, res, next) => {
    try {
      const { id } = req.params;
      const reviewToDelete = await Review.findById(id); // Перевірка існування

      if (!reviewToDelete) {
        return res.status(404).json({ message: "Review not found." });
      }

      const success = await Review.delete(id);
      if (!success) {
        // Модель повернула false (affectedRows === 0)
        return res.status(404).json({
          message: "Review could not be deleted or was already deleted.",
        });
      }
      res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
      next(error);
    }
  },

  getServiceReviews: async (req, res, next) => {
    try {
      const { serviceId } = req.params;
      // Перевірка існування сервісу (опціонально, якщо модель не робить)
      const service = await Service.findById(serviceId);
      if (!service) {
        return res
          .status(404)
          .json({ message: `Service with ID ${serviceId} not found.` });
      }
      // Модель getByServiceId сама має фільтрувати за IsApproved = 1 для публічного перегляду
      const reviews = await Review.getByServiceId(serviceId); // isAdmin за замовчуванням false
      res.status(200).json(reviews);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reviewController;
