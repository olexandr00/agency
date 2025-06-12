// frontend/js/services.js
document.addEventListener("DOMContentLoaded", () => {
  const servicesListContainer = document.getElementById("services-list");
  const servicesLoader = document.getElementById("services-loader");
  const servicesError = document.getElementById("services-error");
  const servicesNoResults = document.getElementById("services-no-results");
  const searchInput = document.getElementById("service-search-input");
  const searchButton = document.getElementById("service-search-button");

  const API_URL = "http://localhost:3000/api";

  async function fetchServices(searchTerm = "") {
    if (
      !servicesListContainer ||
      !servicesLoader ||
      !servicesError ||
      !servicesNoResults
    ) {
      console.warn(
        "[services.js] Один або декілька обов'язкових елементів DOM для сторінки послуг не знайдено. Роботу скрипта може бути порушено."
      );
      // Якщо servicesListContainer немає, то немає сенсу продовжувати
      if (!servicesListContainer) return;
    }

    servicesLoader.style.display = "block";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "none";
    servicesListContainer.innerHTML = ""; // Очистити попередні результати, крім лоадера/помилок

    try {
      const url = searchTerm
        ? `${API_URL}/services?search=${encodeURIComponent(searchTerm)}`
        : `${API_URL}/services`;
      const response = await fetch(url);
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
      const services = await response.json();
      displayServices(services);
    } catch (error) {
      console.error("[services.js] Помилка завантаження послуг:", error);
      if (servicesError) {
        servicesError.textContent = `Помилка завантаження послуг: ${error.message}`;
        servicesError.style.display = "block";
      }
    } finally {
      if (servicesLoader) servicesLoader.style.display = "none";
    }
  }

  function displayServices(services) {
    console.log(
      "[services.js displayServices] Отримано послуги:",
      JSON.stringify(services, null, 2)
    ); // Детальний лог

    const servicesListContainer = document.getElementById("services-list");
    const servicesNoResults = document.getElementById("services-no-results");

    if (!servicesListContainer) {
      console.error(
        "[services.js displayServices] ПОМИЛКА: servicesListContainer не знайдено!"
      );
      return;
    }
    servicesListContainer.innerHTML = "";

    if (!services || services.length === 0) {
      console.log(
        "[services.js displayServices] Немає послуг для відображення."
      );
      if (servicesNoResults) servicesNoResults.style.display = "block";
      return;
    }
    if (servicesNoResults) servicesNoResults.style.display = "none";

    services.forEach((service, index) => {
      console.log(
        `[services.js displayServices] Обробка послуги з індексом ${index}:`,
        JSON.stringify(service, null, 2)
      );
      try {
        const serviceCard = document.createElement("div");
        serviceCard.className = "service-card card";

        const title = document.createElement("h3");
        title.className = "service-title";
        title.textContent = service.ServiceName;

        const description = document.createElement("p");
        description.className = "service-description";
        description.textContent =
          service.ServiceDescription || "Опис відсутній.";

        const price = document.createElement("p");
        price.className = "service-price";
        if (service.BasePrice !== undefined && service.BasePrice !== null) {
          price.textContent = `Ціна: ${parseFloat(service.BasePrice).toFixed(
            2
          )} грн`;
        } else {
          price.textContent = "Ціна: не вказано";
          console.warn(
            `[services.js displayServices] BasePrice відсутня для послуги ID ${service.ServiceID}`
          );
        }

        const addToCartButton = document.createElement("button");
        addToCartButton.className = "button add-to-cart-button";
        addToCartButton.textContent = "Додати в кошик";
        addToCartButton.dataset.serviceId = service.ServiceID;
        addToCartButton.dataset.serviceName = service.ServiceName;
        addToCartButton.dataset.servicePrice = service.BasePrice;

        addToCartButton.addEventListener("click", () => {
          if (typeof Cart !== "undefined" && Cart.addItem) {
            Cart.addItem({
              id: service.ServiceID,
              name: service.ServiceName,
              price: service.BasePrice,
            });
          } else {
            console.error(
              "[services.js] Об'єкт Cart або метод Cart.addItem недоступний."
            );
            alert("Помилка: Функціонал кошика недоступний.");
          }
        });

        serviceCard.appendChild(title);
        serviceCard.appendChild(description);
        serviceCard.appendChild(price);
        serviceCard.appendChild(addToCartButton);

        servicesListContainer.appendChild(serviceCard);
      } catch (e) {
        console.error(
          `[services.js displayServices] Помилка обробки послуги ${service.ServiceID}:`,
          e
        );
      }
    });
  }

  // Обробник для кнопки пошуку
  if (searchButton && searchInput) {
    searchButton.addEventListener("click", () => {
      fetchServices(searchInput.value.trim());
    });
    // Також пошук при натисканні Enter в полі вводу
    searchInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        fetchServices(searchInput.value.trim());
      }
    });
  } else {
    console.warn(
      "[services.js] Елементи пошуку (кнопка або поле вводу) не знайдені."
    );
  }

  // Початкове завантаження послуг
  fetchServices();
});
