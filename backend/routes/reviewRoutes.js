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
router.get("/", flexibleAuth, reviewController.getAllReviews);

// Для створення відгуку (користувач має бути автентифікований)
// Тут залишаємо строгий isAuthenticated
router.post("/", isAuthenticated, reviewController.createReview);

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
router.get("/:id", isAuthenticated, isAdmin, reviewController.getReviewById);

// Публічний маршрут для відгуків за сервісом, не потребує аутентифікації тут,
router.get("/service/:serviceId", reviewController.getServiceReviews);

module.exports = router;
