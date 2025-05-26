// frontend/js/services.js
document.addEventListener("DOMContentLoaded", () => {
  const servicesListContainer = document.getElementById("services-list");
  const servicesLoader = document.getElementById("services-loader");
  const servicesError = document.getElementById("services-error");
  const servicesNoResults = document.getElementById("services-no-results");
  const searchInput = document.getElementById("service-search-input");
  const searchButton = document.getElementById("service-search-button");

  const API_URL = "http://localhost:3000/api"; // Переконайтеся, що порт правильний

  async function fetchServices(searchTerm = "") {
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
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      const services = await response.json();
      displayServices(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      servicesError.textContent = `Помилка завантаження послуг: ${error.message}`;
      servicesError.style.display = "block";
    } finally {
      servicesLoader.style.display = "none";
    }
  }

  // frontend/js/services.js
  function displayServices(services) {
    console.log(
      "[displayServices] Received services:",
      JSON.stringify(services, null, 2)
    ); // Детальний лог

    const servicesListContainer = document.getElementById("services-list"); // Перенесіть сюди, щоб перевіряти наявність
    const servicesNoResults = document.getElementById("services-no-results"); // І це

    if (!servicesListContainer) {
      console.error(
        "[displayServices] ERROR: servicesListContainer not found!"
      );
      return;
    }
    servicesListContainer.innerHTML = "";

    if (!services || services.length === 0) {
      console.log("[displayServices] No services to display.");
      if (servicesNoResults) servicesNoResults.style.display = "block";
      return;
    }
    if (servicesNoResults) servicesNoResults.style.display = "none";

    services.forEach((service, index) => {
      console.log(
        `[displayServices] Processing service at index ${index}:`,
        JSON.stringify(service, null, 2)
      );
      try {
        const serviceCard = document.createElement("div");
        serviceCard.className = "service-card card";

        const title = document.createElement("h3");
        title.className = "service-title";
        title.textContent = service.ServiceName; // Перевірте, чи є ServiceName

        const description = document.createElement("p");
        description.className = "service-description";
        description.textContent =
          service.ServiceDescription || "Опис відсутній."; // Перевірте ServiceDescription

        const price = document.createElement("p");
        price.className = "service-price";
        // Перевірте BasePrice і чи він не undefined/null перед parseFloat
        if (service.BasePrice !== undefined && service.BasePrice !== null) {
          price.textContent = `Ціна: ${parseFloat(service.BasePrice).toFixed(
            2
          )} грн`;
        } else {
          price.textContent = "Ціна: не вказано";
          console.warn(
            `[displayServices] BasePrice is missing for service ID ${service.ServiceID}`
          );
        }

        const addToCartButton = document.createElement("button");
        addToCartButton.className = "button add-to-cart-button";
        addToCartButton.textContent = "Додати в кошик";
        addToCartButton.dataset.serviceId = service.ServiceID;
        addToCartButton.dataset.serviceName = service.ServiceName;
        addToCartButton.dataset.servicePrice = service.BasePrice;

        addToCartButton.addEventListener("click", () => {
          Cart.addItem({
            id: service.ServiceID,
            name: service.ServiceName,
            price: service.BasePrice, // Передаємо рядок або вже розпарсену ціну
          });
        });

        serviceCard.appendChild(title);
        serviceCard.appendChild(description);
        serviceCard.appendChild(price);
        serviceCard.appendChild(addToCartButton);

        servicesListContainer.appendChild(serviceCard);
      } catch (e) {
        console.error(
          `[displayServices] Error processing service ${service.ServiceID}:`,
          e
        );
        // Якщо є помилка при обробці однієї картки, інші все одно мають обробитися
      }
    });
  }

  // Обробник для кнопки пошуку
  if (searchButton && searchInput) {
    searchButton.addEventListener("click", () => {
      fetchServices(searchInput.value.trim());
    });
    // Також можна додати пошук при натисканні Enter в полі вводу
    searchInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        fetchServices(searchInput.value.trim());
      }
    });
  }

  // Початкове завантаження послуг
  fetchServices();
});
