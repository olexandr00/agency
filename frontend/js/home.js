// frontend/js/home.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("[home.js] Подія DOMContentLoaded спрацювала.");

  const API_URL = "http://localhost:3000/api";

  const popularServicesListContainer = document.getElementById(
    "popular-services-list"
  );
  const testimonialsListContainer =
    document.getElementById("testimonials-list");

  const animatedElements = document.querySelectorAll(".animate-on-scroll");
  if (animatedElements.length > 0) {
    // Якщо такі елементи є
    // Створюємо IntersectionObserver
    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        // Колбек-функція, яка викликається, коли видимість елементів змінюється
        entries.forEach((entry) => {
          // Проходимо по всіх елементах, за якими спостерігаємо
          if (entry.isIntersecting) {
            // Якщо елемент зараз видимий на екрані
            entry.target.classList.add("is-visible"); // Додаємо клас для запуску CSS-анімації
            observerInstance.unobserve(entry.target); // Припиняємо спостереження за цим елементом (анімація має спрацювати один раз)
          }
        });
      },
      {
        threshold: 0.15,
      }
    );
    animatedElements.forEach((el) => observer.observe(el));
  }

  // --- Завантаження популярних послуг ---
  async function fetchPopularServices() {
    if (!popularServicesListContainer) {
      console.error(
        '[home.js] ПОМИЛКА: Елемент з ID "popular-services-list" не знайдено!'
      );
      return;
    }
    console.log("[home.js] fetchPopularServices - ПОЧАТОК");

    const loader = popularServicesListContainer.querySelector(".loader-text");
    if (loader) {
      loader.style.display = "block";
    } else {
      // Якщо лоадера немає, створимо його тимчасово, щоб було видно, що йде запит
      popularServicesListContainer.innerHTML =
        '<p class="loader-text" id="temp-service-loader">Завантаження послуг...</p>';
    }

    try {
      // Спробуємо завантажити до 3 послуг. Бекенд має підтримувати ?limit=3
      const response = await fetch(`${API_URL}/services`); // Спочатку завантажуємо всі
      console.log(
        "[home.js] fetchPopularServices - Статус відповіді API:",
        response.status
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP помилка! Статус: ${response.status}`,
        }));
        throw new Error(
          errorData.message || `HTTP помилка! Статус: ${response.status}`
        );
      }

      let services = await response.json();
      console.log(
        "[home.js] fetchPopularServices - Отримано всі послуги:",
        services.length
      );

      // Обрізаємо до 3 послуг, якщо їх більше
      if (services.length > 3) {
        services = services.slice(0, 3);
        console.log(
          "[home.js] fetchPopularServices - Обрізано до 3 послуг:",
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
          "[home.js] fetchPopularServices - Немає популярних послуг для відображення."
        );
        popularServicesListContainer.innerHTML =
          '<p class="info-text" style="text-align:center;">Популярних послуг наразі немає.</p>';
        return;
      }

      services.forEach((service, index) => {
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
              "[home.js] Об'єкт Cart або метод Cart.addItem недоступний."
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
        "[home.js] fetchPopularServices - ЗАВЕРШЕНО відображення популярних послуг."
      );
    } catch (error) {
      console.error("[home.js] fetchPopularServices - Помилка:", error);
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
        '[home.js] ПОМИЛКА: Елемент з ID "testimonials-list" не знайдено!'
      );
      return;
    }
    console.log("[home.js] fetchTestimonials - ПОЧАТОК");

    const loader = testimonialsListContainer.querySelector(".loader-text");
    if (loader) {
      loader.style.display = "block";
    } else {
      testimonialsListContainer.innerHTML =
        '<p class="loader-text" id="temp-review-loader">Завантаження відгуків...</p>';
    }

    try {
      const response = await fetch(`${API_URL}/reviews`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP помилка! Статус: ${response.status}`,
        }));
        throw new Error(
          errorData.message || `HTTP помилка! Статус: ${response.status}`
        );
      }
      let reviews = await response.json();

      // Фільтруємо тільки схвалені (IsApproved = 1 або true) та беремо перші 3
      const approvedReviews = reviews
        .filter((review) => review.IsApproved)
        .slice(0, 3);

      const currentLoader =
        document.getElementById("temp-review-loader") ||
        testimonialsListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();

      testimonialsListContainer.innerHTML = "";

      if (approvedReviews.length === 0) {
        testimonialsListContainer.innerHTML =
          '<p class="info-text" style="text-align:center;">Наразі немає відгуків.</p>';
        return;
      }

      approvedReviews.forEach((review, index) => {
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
    } catch (error) {
      console.error("[home.js] fetchTestimonials - Помилка:", error);
      const currentLoader =
        document.getElementById("temp-review-loader") ||
        testimonialsListContainer.querySelector(".loader-text");
      if (currentLoader) currentLoader.remove();
      testimonialsListContainer.innerHTML = `<p class="error-text" style="text-align:center;">Не вдалося завантажити відгуки. ${error.message}</p>`;
    }
  }

  if (
    document.getElementById("popular-services-list") &&
    document.getElementById("testimonials-list")
  ) {
    fetchPopularServices();
    fetchTestimonials();
  }
});
