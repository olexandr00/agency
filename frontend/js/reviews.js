// frontend/js/reviews.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3000/api";

  const reviewsListDiv = document.getElementById("reviews-list");
  const reviewsLoader = document.getElementById("reviews-loader");
  const reviewsError = document.getElementById("reviews-error");
  const reviewsNoResults = document.getElementById("reviews-no-results");

  const addReviewSection = document.getElementById("add-review-section");
  const addReviewForm = document.getElementById("add-review-form");
  const addReviewMessage = document.getElementById("add-review-message");
  const reviewServiceSelect = document.getElementById("reviewService");
  const loginToReviewMessage = document.getElementById(
    "login-to-review-message"
  );

  // --- Функція для відображення зірочок рейтингу ---
  function renderRatingStars(rating) {
    if (rating === null || rating === undefined || rating === 0) return "";
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="star ${i <= rating ? "filled" : ""}">★</span>`;
    }
    return `<div class="rating-stars">${stars}</div>`;
  }

  // --- Завантаження та відображення всіх схвалених відгуків ---
  async function fetchAndDisplayReviews() {
    if (!reviewsListDiv) return;

    reviewsLoader.style.display = "block";
    reviewsError.style.display = "none";
    reviewsNoResults.style.display = "none";
    reviewsListDiv.innerHTML = ""; // Очистити, крім лоадера/повідомлень

    try {
      const response = await fetch(`${API_URL}/reviews`); // Отримує тільки схвалені за замовчуванням (якщо бекенд налаштований)
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      const reviews = await response.json();

      reviewsLoader.style.display = "none";

      if (reviews.length === 0) {
        reviewsNoResults.style.display = "block";
        return;
      }

      reviews.forEach((review) => {
        const reviewCard = document.createElement("div");
        reviewCard.className = "testimonial-card card"; // Використовуємо той же стиль, що й на головній

        const reviewHeader = document.createElement("div");
        reviewHeader.className = "review-header";

        const author = document.createElement("strong");
        author.textContent = review.UserName || "Анонім";

        const date = document.createElement("span");
        date.className = "review-date";
        date.textContent = new Date(review.ReviewDate).toLocaleDateString(
          "uk-UA"
        );

        reviewHeader.appendChild(author);
        reviewHeader.appendChild(date);

        if (review.ServiceName) {
          const serviceNameP = document.createElement("p");
          serviceNameP.className = "review-service-name";
          serviceNameP.innerHTML = `Послуга: <em>${review.ServiceName}</em>`;
          reviewCard.appendChild(serviceNameP);
        }

        if (review.Rating) {
          const ratingDiv = document.createElement("div");
          ratingDiv.className = "review-rating";
          ratingDiv.innerHTML = renderRatingStars(review.Rating);
          reviewCard.appendChild(ratingDiv);
        }

        const text = document.createElement("p");
        text.className = "testimonial-text"; // Зберігаємо стиль
        text.textContent = `"${review.ReviewText}"`; // Лапки можна додати в CSS через ::before або тут

        reviewCard.appendChild(reviewHeader);
        reviewCard.appendChild(text);
        reviewsListDiv.appendChild(reviewCard);
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      reviewsLoader.style.display = "none";
      reviewsError.textContent = `Помилка завантаження відгуків: ${error.message}`;
      reviewsError.style.display = "block";
    }
  }

  // --- Логіка для форми додавання відгуку ---
  async function populateServicesSelect() {
    if (!reviewServiceSelect) return;
    try {
      const response = await fetch(`${API_URL}/services`);
      if (!response.ok) throw new Error("Failed to load services");
      const services = await response.json();
      services.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.ServiceID;
        option.textContent = service.ServiceName;
        reviewServiceSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error populating services select:", error);
      // Можна додати повідомлення про помилку завантаження списку послуг
    }
  }

  function setupAddReviewForm() {
    if (Auth.isLoggedIn()) {
      addReviewSection.style.display = "block";
      loginToReviewMessage.style.display = "none";
      populateServicesSelect(); // Завантажити послуги для випадаючого списку

      if (addReviewForm) {
        addReviewForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          addReviewMessage.textContent = "";
          addReviewMessage.className = "form-message";

          const formData = new FormData(addReviewForm);
          const reviewData = {
            reviewText: formData.get("reviewText"),
            rating: formData.get("rating")
              ? parseInt(formData.get("rating"))
              : null,
            serviceId: formData.get("serviceId")
              ? parseInt(formData.get("serviceId"))
              : null,
          };

          if (!reviewData.reviewText) {
            addReviewMessage.textContent =
              "Текст відгуку не може бути порожнім.";
            addReviewMessage.classList.add("error");
            return;
          }

          try {
            const response = await fetch(`${API_URL}/reviews`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Auth.getToken()}`,
              },
              body: JSON.stringify(reviewData),
            });
            const result = await response.json();

            if (response.ok) {
              // 201 Created
              addReviewMessage.textContent =
                result.message || "Ваш відгук відправлено на модерацію!";
              addReviewMessage.classList.add("success");
              addReviewForm.reset();
              // Можна оновити список відгуків, але новий відгук не буде видно до схвалення
              // fetchAndDisplayReviews(); // Або просто показати повідомлення
            } else {
              addReviewMessage.textContent =
                result.message || "Помилка відправки відгуку.";
              addReviewMessage.classList.add("error");
            }
          } catch (error) {
            console.error("Error submitting review:", error);
            addReviewMessage.textContent =
              "Сталася помилка сервера. Спробуйте пізніше.";
            addReviewMessage.classList.add("error");
          }
        });
      }
    } else {
      addReviewSection.style.display = "none";
      loginToReviewMessage.style.display = "block";
    }
  }

  // Ініціалізація
  fetchAndDisplayReviews();
  setupAddReviewForm();
});
