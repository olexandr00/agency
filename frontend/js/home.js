// frontend/js/home.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("[home.js] DOMContentLoaded event fired.");

  const API_URL = "http://localhost:3000/api"; // Переконайтеся, що це правильний URL вашого API

  const popularServicesListContainer = document.getElementById(
    "popular-services-list"
  );
  const testimonialsListContainer =
    document.getElementById("testimonials-list");

  // --- Анімація при прокрутці (якщо ви її використовуєте) ---
  const animatedElements = document.querySelectorAll(".animate-on-scroll");
  if (animatedElements.length > 0) {
    // console.log('[home.js] Found elements to animate on scroll:', animatedElements.length);
    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observerInstance.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
      }
    );
    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // console.log('[home.js] No elements found with .animate-on-scroll class.');
  }

  // --- Завантаження популярних послуг ---
  async function fetchPopularServices() {
    if (!popularServicesListContainer) {
      console.error(
        '[home.js] ERROR: Element with ID "popular-services-list" not found!'
      );
      return;
    }
    console.log("[home.js] fetchPopularServices - START");

    const loader = popularServicesListContainer.querySelector(".loader-text");
    if (loader) {
      loader.style.display = "block";
    } else {
      // Якщо лоадера немає, створимо його тимчасово, щоб було видно, що йде запит
      popularServicesListContainer.innerHTML =
        '<p class="loader-text" id="temp-service-loader">Завантаження послуг...</p>';
    }

    try {
      // Спробуємо завантажити до 3 послуг. Бекенд має підтримувати ?limit=3 або повернути всі, а ми обріжемо.
      const response = await fetch(`${API_URL}/services`); // Спочатку завантажуємо всі
      console.log(
        "[home.js] fetchPopularServices - API Response Status:",
        response.status
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      let services = await response.json();
      console.log(
        "[home.js] fetchPopularServices - All services received:",
        services.length
      );

      // Обрізаємо до 3 послуг, якщо їх більше
      if (services.length > 3) {
        services = services.slice(0, 3);
        console.log(
          "[home.js] fetchPopularServices - Sliced to 3 services:",
          services.length
        );
      }

      // Видаляємо лоадер, чи то тимчасовий, чи постійний
      const currentLoader =
        document.getElementById("temp-service-loader") ||
        popularServicesListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();

      popularServicesListContainer.innerHTML = ""; // Очистити перед додаванням нових карток

      if (services.length === 0) {
        console.log(
          "[home.js] fetchPopularServices - No popular services to display."
        );
        popularServicesListContainer.innerHTML =
          '<p class="info-text" style="text-align:center;">Популярних послуг наразі немає.</p>';
        return;
      }

      services.forEach((service, index) => {
        // console.log(`[home.js] fetchPopularServices - Rendering service index ${index}:`, service.ServiceName);
        const serviceCard = document.createElement("div");
        serviceCard.className = "service-card card";

        const title = document.createElement("h3");
        title.className = "service-title";
        title.textContent = service.ServiceName || "Без назви";

        const description = document.createElement("p");
        description.className = "service-description";
        const descText =
          service.ServiceDescription || "Короткий опис послуги...";
        description.textContent =
          descText.length > 100 ? descText.substring(0, 97) + "..." : descText;

        const price = document.createElement("p");
        price.className = "service-price";
        if (service.BasePrice !== undefined && service.BasePrice !== null) {
          price.textContent = `Від ${parseFloat(service.BasePrice).toFixed(
            2
          )} грн`;
        } else {
          price.textContent = "Ціна: за запитом";
        }

        const addToCartButton = document.createElement("button");
        addToCartButton.className = "button add-to-cart-button";
        addToCartButton.textContent = "В кошик";
        addToCartButton.addEventListener("click", () => {
          if (typeof Cart !== "undefined" && Cart.addItem) {
            Cart.addItem({
              id: service.ServiceID,
              name: service.ServiceName,
              price: service.BasePrice,
            });
          } else {
            console.error(
              "[home.js] Cart object or Cart.addItem method is not available."
            );
            alert("Помилка: Функціонал кошика недоступний.");
          }
        });

        serviceCard.appendChild(title);
        serviceCard.appendChild(description);
        serviceCard.appendChild(price);
        serviceCard.appendChild(addToCartButton);
        popularServicesListContainer.appendChild(serviceCard);
      });
      console.log(
        "[home.js] fetchPopularServices - FINISHED rendering popular services."
      );
    } catch (error) {
      console.error("[home.js] fetchPopularServices - Error:", error);
      const currentLoader =
        document.getElementById("temp-service-loader") ||
        popularServicesListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();
      popularServicesListContainer.innerHTML = `<p class="error-text" style="text-align:center;">Не вдалося завантажити популярні послуги. ${error.message}</p>`;
    }
  }

  // --- Завантаження відгуків ---
  async function fetchTestimonials() {
    if (!testimonialsListContainer) {
      console.error(
        '[home.js] ERROR: Element with ID "testimonials-list" not found!'
      );
      return;
    }
    console.log("[home.js] fetchTestimonials - START");

    const loader = testimonialsListContainer.querySelector(".loader-text");
    if (loader) {
      loader.style.display = "block";
    } else {
      testimonialsListContainer.innerHTML =
        '<p class="loader-text" id="temp-review-loader">Завантаження відгуків...</p>';
    }

    try {
      const response = await fetch(`${API_URL}/reviews`);
      console.log(
        "[home.js] fetchTestimonials - API Response Status:",
        response.status
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      let reviews = await response.json();
      console.log(
        "[home.js] fetchTestimonials - All reviews received:",
        reviews.length
      );

      // Фільтруємо тільки схвалені (IsApproved = 1 або true) та беремо перші 3
      const approvedReviews = reviews
        .filter((review) => review.IsApproved)
        .slice(0, 3);
      console.log(
        "[home.js] fetchTestimonials - Approved and sliced reviews:",
        approvedReviews.length
      );

      const currentLoader =
        document.getElementById("temp-review-loader") ||
        testimonialsListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();

      testimonialsListContainer.innerHTML = "";

      if (approvedReviews.length === 0) {
        console.log(
          "[home.js] fetchTestimonials - No approved testimonials to display."
        );
        testimonialsListContainer.innerHTML =
          '<p class="info-text" style="text-align:center;">Наразі немає відгуків.</p>';
        return;
      }

      approvedReviews.forEach((review, index) => {
        // console.log(`[home.js] fetchTestimonials - Rendering review index ${index}:`, review.UserName);
        const testimonialCard = document.createElement("div");
        testimonialCard.className = "testimonial-card card";

        const reviewText = document.createElement("p");
        reviewText.className = "testimonial-text";
        const text = review.ReviewText || "";
        reviewText.textContent = `"${
          text.length > 150 ? text.substring(0, 147) + "..." : text
        }"`;

        const reviewAuthor = document.createElement("p");
        reviewAuthor.className = "testimonial-author";
        reviewAuthor.textContent = `- ${review.UserName || "Анонім"}`;

        testimonialCard.appendChild(reviewText);
        testimonialCard.appendChild(reviewAuthor);
        testimonialsListContainer.appendChild(testimonialCard);
      });
      console.log(
        "[home.js] fetchTestimonials - FINISHED rendering testimonials."
      );
    } catch (error) {
      console.error("[home.js] fetchTestimonials - Error:", error);
      const currentLoader =
        document.getElementById("temp-review-loader") ||
        testimonialsListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();
      testimonialsListContainer.innerHTML = `<p class="error-text" style="text-align:center;">Не вдалося завантажити відгуки. ${error.message}</p>`;
    }
  }

  // Перевірка, чи ми на головній сторінці, перш ніж викликати функції
  // (хоча, якщо цей скрипт підключається тільки на index.html, ця перевірка не обов'язкова,
  // але не завадить, якщо структура проекту зміниться)
  if (
    document.getElementById("popular-services-list") &&
    document.getElementById("testimonials-list")
  ) {
    console.log("[home.js] Initializing data fetch for home page.");
    fetchPopularServices();
    fetchTestimonials();
  } else {
    console.log(
      "[home.js] Not on home page or required elements are missing. Skipping data fetch."
    );
  }
});
