// backend/routes/reviewRoutes.js
const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const {
  isAuthenticated,
  isAdmin,
  flexibleAuth,
} = require("../middleware/authMiddleware"); // Додаємо flexibleAuth

// Для маршруту GET /api/reviews (отримання всіх відгуків):
// Використовуємо flexibleAuth, який спробує встановити req.user,
// але не блокуватиме запит, якщо користувач не автентифікований.
router.get("/", flexibleAuth, reviewController.getAllReviews); // <--- ЗМІНА ТУТ

// Для створення відгуку (користувач має бути автентифікований)
// Тут залишаємо строгий isAuthenticated, бо для створення відгуку потрібен userId
router.post("/", isAuthenticated, reviewController.createReview);
// У reviewController.createReview вже має бути перевірка req.user
// if (!req.user || !req.user.userId) { return res.status(401).json({ message: "Authentication required to create a review." }); }
// const userId = req.user.userId;

// Для маршрутів, які вимагають АДМІНА:
// Спочатку isAuthenticated (щоб був req.user), потім isAdmin
router.patch("/:id", isAuthenticated, isAdmin, reviewController.updateReview);
router.patch(
  "/:id/approve",
  isAuthenticated,
  isAdmin,
  reviewController.approveReview
);
router.delete("/:id", isAuthenticated, isAdmin, reviewController.deleteReview);

// Для отримання одного відгуку за ID:
// Якщо деталі може бачити будь-хто (але зі схваленням), то flexibleAuth.
// Якщо тільки адмін - isAuthenticated, isAdmin.
// Поточна логіка в getReviewById не має фільтрації IsApproved, тому безпечніше залишити для адмінів.
router.get("/:id", isAuthenticated, isAdmin, reviewController.getReviewById);

// Публічний маршрут для відгуків за сервісом, не потребує аутентифікації тут,
// бо контролер getServiceReviews сам обробляє логіку (показує тільки схвалені).
router.get("/service/:serviceId", reviewController.getServiceReviews);

module.exports = router;
