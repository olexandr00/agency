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

  // Функція для відображення зірочок рейтингу
  function renderRatingStars(rating) {
    if (rating === null || rating === undefined || rating === 0) return "";
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="star ${i <= rating ? "filled" : ""}">★</span>`;
    }
    return `<div class="rating-stars">${stars}</div>`;
  }

  // Завантаження та відображення всіх схвалених відгуків
  async function fetchAndDisplayReviews() {
    if (!reviewsListDiv) {
      console.warn(
        "[reviews.js] Елемент reviewsListDiv не знайдено, завантаження відгуків скасовано."
      );
      return;
    }

    reviewsLoader.style.display = "block";
    reviewsError.style.display = "none";
    reviewsNoResults.style.display = "none";
    reviewsListDiv.innerHTML = "";

    try {
      const response = await fetch(`${API_URL}/reviews`); // Отримує тільки схвалені за замовчуванням
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({
            message: `HTTP помилка! Статус: ${response.status}`,
          }));
        throw new Error(
          errorData.message || `HTTP помилка! Статус: ${response.status}`
        );
      }
      const reviews = await response.json();
      console.log("[reviews.js] Отримано відгуків:", reviews.length);

      reviewsLoader.style.display = "none";

      if (reviews.length === 0) {
        reviewsNoResults.style.display = "block";
        console.log("[reviews.js] Немає схвалених відгуків для відображення.");
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
        text.textContent = `"${review.ReviewText}"`;

        reviewCard.appendChild(reviewHeader);
        reviewCard.appendChild(text);
        reviewsListDiv.appendChild(reviewCard);
      });
      console.log("[reviews.js] Успішно відображено відгуки.");
    } catch (error) {
      console.error("[reviews.js] Помилка завантаження відгуків:", error);
      reviewsLoader.style.display = "none";
      reviewsError.textContent = `Помилка завантаження відгуків: ${error.message}`;
      reviewsError.style.display = "block";
    }
  }

  // Логіка для форми додавання відгуку
  async function populateServicesSelect() {
    if (!reviewServiceSelect) {
      console.warn(
        "[reviews.js] Елемент reviewServiceSelect не знайдено, заповнення списку послуг скасовано."
      );
      return;
    }
    try {
      const response = await fetch(`${API_URL}/services`);
      if (!response.ok) throw new Error("Не вдалося завантажити послуги");
      const services = await response.json();
      services.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.ServiceID;
        option.textContent = service.ServiceName;
        reviewServiceSelect.appendChild(option);
      });
      console.log("[reviews.js] Список послуг для відгуків заповнено.");
    } catch (error) {
      console.error("[reviews.js] Помилка заповнення списку послуг:", error);
    }
  }

  function setupAddReviewForm() {
    if (!addReviewSection || !loginToReviewMessage) {
      console.warn(
        "[reviews.js] Один або декілька елементів форми додавання відгуку не знайдено."
      );
      return;
    }

    if (typeof Auth !== "undefined" && Auth.isLoggedIn()) {
      addReviewSection.style.display = "block";
      loginToReviewMessage.style.display = "none";
      populateServicesSelect(); // Завантажити послуги для випадаючого списку

      if (addReviewForm) {
        addReviewForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          if (addReviewMessage) {
            addReviewMessage.textContent = "";
            addReviewMessage.className = "form-message";
          }

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
            if (addReviewMessage) {
              addReviewMessage.textContent =
                "Текст відгуку не може бути порожнім.";
              addReviewMessage.classList.add("error");
            }
            return;
          }

          const submitButton = addReviewForm.querySelector(
            'button[type="submit"]'
          );
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Відправка...";
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
              if (addReviewMessage) {
                addReviewMessage.textContent =
                  result.message || "Ваш відгук відправлено на модерацію!";
                addReviewMessage.classList.add("success");
              }
              addReviewForm.reset();
              console.log("[reviews.js] Відгук успішно відправлено.");
            } else {
              if (addReviewMessage) {
                addReviewMessage.textContent =
                  result.message || "Помилка відправки відгуку.";
                addReviewMessage.classList.add("error");
              }
              console.error(
                "[reviews.js] Помилка відправки відгуку, відповідь сервера:",
                result
              );
            }
          } catch (error) {
            console.error("[reviews.js] Помилка при відправці відгуку:", error);
            if (addReviewMessage) {
              addReviewMessage.textContent =
                "Сталася помилка сервера. Спробуйте пізніше.";
              addReviewMessage.classList.add("error");
            }
          } finally {
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "Залишити відгук";
            }
          }
        });
      } else {
        console.warn("[reviews.js] Елемент addReviewForm не знайдено.");
      }
    } else {
      addReviewSection.style.display = "none";
      loginToReviewMessage.style.display = "block";
      console.log(
        "[reviews.js] Користувач не авторизований, форма додавання відгуку прихована."
      );
    }
  }

  // Ініціалізація
  fetchAndDisplayReviews();
  setupAddReviewForm();
});
