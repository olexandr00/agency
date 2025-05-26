// frontend/js/admin/crud-services.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_SERVICES = "http://localhost:3000/api/services";
  const token = Auth.getToken();

  const servicesTableBody = document.getElementById("servicesTableBody");
  const servicesLoader = document.getElementById("services-loader");
  const servicesError = document.getElementById("services-error");
  const servicesNoResults = document.getElementById("services-no-results");

  const addServiceBtn = document.getElementById("addServiceBtn");
  const serviceModal = document.getElementById("serviceModal");
  const closeModalButton = serviceModal.querySelector(".close-modal-button");
  const serviceForm = document.getElementById("serviceForm");
  const modalTitle = serviceModal.querySelector("#modalTitle"); // Уточнений селектор
  const serviceIdInput = document.getElementById("serviceId");
  const serviceFormMessage = document.getElementById("service-form-message");
  const serviceSearchInput = document.getElementById("serviceSearchInput");

  let currentServices = [];

  // --- Завантаження та відображення послуг ---
  async function fetchAndDisplayServices(searchTerm = "") {
    showLoader();
    try {
      let url = API_URL_SERVICES;
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }, // Адмін має бачити всі послуги
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }
      currentServices = await response.json();
      renderServicesTable(currentServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      showError(error.message);
    }
  }

  function renderServicesTable(services) {
    hideMessages();
    servicesTableBody.innerHTML = "";

    if (services.length === 0) {
      showNoResults();
      return;
    }

    services.forEach((service) => {
      const row = servicesTableBody.insertRow();

      // Не відображаємо ID
      // row.insertCell().textContent = service.ServiceID;
      row.insertCell().textContent = service.ServiceName;

      const descriptionCell = row.insertCell();
      descriptionCell.textContent = service.ServiceDescription
        ? service.ServiceDescription.length > 70
          ? service.ServiceDescription.substring(0, 70) + "..."
          : service.ServiceDescription
        : "-";
      descriptionCell.title = service.ServiceDescription || ""; // Повний опис у вспливаючій підказці

      const priceCell = row.insertCell();
      priceCell.textContent = parseFloat(service.BasePrice).toFixed(2);
      priceCell.style.textAlign = "right";

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";

      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(service));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteService(service.ServiceID, service.ServiceName)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  // --- Показ/приховування повідомлень ---
  function showLoader() {
    /* ... (як у crud-users.js) ... */
    servicesLoader.style.display = "block";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "none";
  }
  function showError(message) {
    /* ... (як у crud-users.js) ... */
    servicesLoader.style.display = "none";
    servicesError.textContent = `Помилка: ${message}`;
    servicesError.style.display = "block";
    servicesNoResults.style.display = "none";
  }
  function showNoResults() {
    /* ... (як у crud-users.js) ... */
    servicesLoader.style.display = "none";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "block";
  }
  function hideMessages() {
    /* ... (як у crud-users.js) ... */
    servicesLoader.style.display = "none";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "none";
  }

  // --- Модальне вікно та форма ---
  function openModal(title = "Додати Послугу", service = null) {
    modalTitle.textContent = title;
    serviceForm.reset();
    serviceIdInput.value = "";
    serviceFormMessage.textContent = "";
    serviceFormMessage.className = "form-message";

    if (service) {
      serviceIdInput.value = service.ServiceID;
      serviceForm.serviceName.value = service.ServiceName;
      serviceForm.serviceDescription.value = service.ServiceDescription || "";
      serviceForm.basePrice.value = parseFloat(service.BasePrice).toFixed(2);
    }
    serviceModal.classList.add("active");
  }

  function closeModal() {
    serviceModal.classList.remove("active");
  }

  function openModalForEdit(service) {
    openModal("Редагувати Послугу", service);
  }

  addServiceBtn.addEventListener("click", () => openModal());
  closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === serviceModal) {
      closeModal();
    }
  });

  // Обробка відправки форми
  serviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    serviceFormMessage.textContent = "";
    serviceFormMessage.className = "form-message";

    const id = serviceIdInput.value;
    const isEditMode = !!id;

    const serviceData = {
      serviceName: serviceForm.serviceName.value,
      serviceDescription: serviceForm.serviceDescription.value,
      basePrice: parseFloat(serviceForm.basePrice.value),
    };

    if (
      !serviceData.serviceName ||
      isNaN(serviceData.basePrice) ||
      serviceData.basePrice < 0
    ) {
      serviceFormMessage.textContent =
        "Назва послуги та коректна ціна є обов'язковими.";
      serviceFormMessage.classList.add("error");
      return;
    }

    const url = isEditMode ? `${API_URL_SERVICES}/${id}` : API_URL_SERVICES;
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(serviceData),
      });
      const result = await response.json();

      if (response.ok) {
        serviceFormMessage.textContent =
          result.message ||
          `Послугу успішно ${isEditMode ? "оновлено" : "створено"}!`;
        serviceFormMessage.classList.add("success");
        fetchAndDisplayServices(serviceSearchInput.value.trim());
        setTimeout(() => {
          closeModal();
        }, 1500);
      } else {
        serviceFormMessage.textContent =
          result.message ||
          `Помилка ${isEditMode ? "оновлення" : "створення"} послуги.`;
        serviceFormMessage.classList.add("error");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      serviceFormMessage.textContent = "Сталася помилка сервера.";
      serviceFormMessage.classList.add("error");
    }
  });

  // --- Видалення послуги ---
  async function deleteService(serviceId, serviceName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити послугу "${serviceName}" (ID: ${serviceId})?`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_SERVICES}/${serviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Перевіряємо, чи відповідь взагалі є, і чи це JSON
      let result = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      } else {
        // Якщо відповідь не JSON, але статус OK, вважаємо успіхом
        if (response.ok)
          result.message = "Послугу успішно видалено (no JSON response)!";
        else result.message = `Помилка: ${response.statusText}`;
      }

      if (response.ok) {
        alert(result.message || "Послугу успішно видалено!");
        fetchAndDisplayServices(serviceSearchInput.value.trim());
      } else {
        alert(
          `Помилка видалення: ${
            result.message || "Не вдалося видалити послугу."
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  // --- Пошук ---
  let searchTimeout;
  serviceSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayServices(serviceSearchInput.value.trim());
    }, 500);
  });

  // Початкове завантаження
  if (token) {
    fetchAndDisplayServices();
  } else {
    showError("Необхідна авторизація для перегляду послуг.");
  }
});
