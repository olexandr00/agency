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
  const modalTitle = serviceModal.querySelector("#modalTitle");
  const serviceIdInput = document.getElementById("serviceId");
  const serviceFormMessage = document.getElementById("service-form-message");
  const serviceSearchInput = document.getElementById("serviceSearchInput");

  // НОВЕ: Селектор для заголовка стовпця ціни.
  // ВАЖЛИВО: Додайте id="price-header-cell" та class="sortable" до вашого тегу <th> для ціни в HTML.
  // Приклад: <th id="price-header-cell" class="sortable">Ціна</th>
  const priceHeaderCell = document.getElementById("price-header-cell");

  const priceChangePercentageInput = document.getElementById(
    "priceChangePercentage"
  );
  const applyPriceChangeBtn = document.getElementById("applyPriceChangeBtn");
  const batchPriceMessage = document.getElementById("batch-price-message");

  let currentServices = [];
  // НОВЕ: Об'єкт для зберігання стану сортування
  let sortConfig = { key: null, ascending: true };

  async function fetchAndDisplayServices(searchTerm = "") {
    // НОВЕ: Скидаємо сортування при завантаженні нових даних (наприклад, після пошуку)
    sortConfig.key = null;
    if (priceHeaderCell) updateSortIndicator(); // Очистити візуальні індикатори

    showLoader();
    try {
      let url = API_URL_SERVICES;
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
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
      row.insertCell().textContent = service.ServiceName;
      const descriptionCell = row.insertCell();
      descriptionCell.textContent = service.ServiceDescription
        ? service.ServiceDescription.length > 70
          ? service.ServiceDescription.substring(0, 70) + "..."
          : service.ServiceDescription
        : "-";
      descriptionCell.title = service.ServiceDescription || "";
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

  // НОВЕ: Функція для оновлення візуального індикатора сортування (стрілочки)
  function updateSortIndicator() {
    document.querySelectorAll("th.sortable").forEach((th) => {
      th.classList.remove("sorted-asc", "sorted-desc");
    });

    if (sortConfig.key && priceHeaderCell) {
      priceHeaderCell.classList.add(
        sortConfig.ascending ? "sorted-asc" : "sorted-desc"
      );
    }
  }

  function showLoader() {
    servicesLoader.style.display = "block";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "none";
  }
  function showError(message) {
    servicesLoader.style.display = "none";
    servicesError.textContent = `Помилка: ${message}`;
    servicesError.style.display = "block";
    servicesNoResults.style.display = "none";
  }
  function showNoResults() {
    servicesLoader.style.display = "none";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "block";
  }
  function hideMessages() {
    servicesLoader.style.display = "none";
    servicesError.style.display = "none";
    servicesNoResults.style.display = "none";
  }
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
  async function deleteService(serviceId, serviceName) {
    if (!confirm(`Ви впевнені, що хочете видалити послугу "${serviceName}"?`)) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_SERVICES}/${serviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      } else {
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

  let searchTimeout;
  serviceSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayServices(serviceSearchInput.value.trim());
    }, 500);
  });

  if (priceHeaderCell) {
    priceHeaderCell.addEventListener("click", () => {
      const sortKey = "BasePrice";

      if (sortConfig.key === sortKey) {
        sortConfig.ascending = !sortConfig.ascending;
      } else {
        sortConfig.key = sortKey;
        sortConfig.ascending = true;
      }

      // Сортуємо масив currentServices
      currentServices.sort((a, b) => {
        const valA = parseFloat(a[sortKey]);
        const valB = parseFloat(b[sortKey]);

        if (isNaN(valA)) return 1; // Нечислові значення відправляємо в кінець
        if (isNaN(valB)) return -1;

        if (valA < valB) {
          return sortConfig.ascending ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.ascending ? 1 : -1;
        }
        return 0; // Значення рівні
      });

      renderServicesTable(currentServices);

      updateSortIndicator();
    });
  }

  // Обробник для зміни цін %
  if (applyPriceChangeBtn) {
    applyPriceChangeBtn.addEventListener("click", async () => {
      const percentageString = priceChangePercentageInput.value;
      if (percentageString.trim() === "") {
        batchPriceMessage.textContent = "Будь ласка, введіть відсоток зміни.";
        batchPriceMessage.className = "form-message error";
        return;
      }
      const percentage = parseFloat(percentageString);
      if (isNaN(percentage)) {
        batchPriceMessage.textContent =
          "Будь ласка, введіть коректне числове значення для відсотка.";
        batchPriceMessage.className = "form-message error";
        return;
      }

      if (
        !confirm(
          `Ви впевнені, що хочете змінити ціни ВСІХ послуг на ${percentage}%?`
        )
      ) {
        return;
      }

      batchPriceMessage.textContent = "Обробка...";
      batchPriceMessage.className = "form-message info";

      try {
        const response = await fetch(
          `${API_URL_SERVICES}/update-prices-batch`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ percentageChange: percentage }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          batchPriceMessage.textContent =
            result.message ||
            `Ціни успішно оновлено на ${percentage}%. Оновлено записів: ${
              result.updatedCount || "N/A"
            }.`;
          batchPriceMessage.className = "form-message success";
          fetchAndDisplayServices(serviceSearchInput.value.trim());
          priceChangePercentageInput.value = "";
        } else {
          batchPriceMessage.textContent =
            result.message || "Помилка при масовому оновленні цін.";
          batchPriceMessage.className = "form-message error";
        }
      } catch (error) {
        console.error("Error updating prices in batch:", error);
        batchPriceMessage.textContent =
          "Сталася помилка сервера при оновленні цін.";
        batchPriceMessage.className = "form-message error";
      }
    });
  }

  // Початкове завантаження
  if (token) {
    fetchAndDisplayServices();
  } else {
    showError("Необхідна авторизація для перегляду послуг.");
  }
});
