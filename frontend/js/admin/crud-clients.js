// frontend/js/admin/crud-clients.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_CLIENTS = "http://localhost:3000/api/clients";
  const token = Auth.getToken(); // Переконайтеся, що Auth та getToken() доступні

  const clientsTableBody = document.getElementById("clientsTableBody");
  const clientsLoader = document.getElementById("clients-loader");
  const clientsError = document.getElementById("clients-error");
  const clientsNoResults = document.getElementById("clients-no-results");

  const addClientBtn = document.getElementById("addClientBtn");
  const clientModal = document.getElementById("clientModal");
  const closeModalButton = clientModal
    ? clientModal.querySelector(".close-modal-button")
    : null;
  const clientForm = document.getElementById("clientForm");
  const modalTitle = clientModal
    ? clientModal.querySelector("#modalTitle")
    : null;
  const clientIdInput = document.getElementById("clientId"); // Приховане поле для ID клієнта
  const clientFormMessage = document.getElementById("client-form-message");
  const clientSearchInput = document.getElementById("clientSearchInput");

  // Отримуємо поле телефону з форми
  const contactPersonPhoneInput = document.getElementById("contactPersonPhone");

  // let currentClients = []; // Не використовується глобально в цьому прикладі

  async function fetchAndDisplayClients(searchTerm = "") {
    showLoader();
    try {
      let url = new URL(API_URL_CLIENTS); // Використовуємо new URL для легкого додавання параметрів
      if (searchTerm) {
        url.searchParams.append("search", searchTerm);
      }
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP Error: ${response.status}` }));
        throw new Error(
          errorData.message ||
            `Не вдалося завантажити клієнтів: ${response.statusText}`
        );
      }
      const clientsData = await response.json(); // Змінив назву, щоб уникнути конфлікту з currentClients
      renderClientsTable(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
      showError(error.message);
    }
  }

  function renderClientsTable(clients) {
    hideMessages();
    if (!clientsTableBody) {
      console.error("clientsTableBody not found");
      return;
    }
    clientsTableBody.innerHTML = "";

    if (!clients || clients.length === 0) {
      showNoResults();
      return;
    }

    clients.forEach((client) => {
      const row = clientsTableBody.insertRow();

      row.insertCell().textContent = client.ClientCompanyName || "-";
      row.insertCell().textContent = client.ContactPersonLastName || "N/A";
      row.insertCell().textContent = client.ContactPersonFirstName || "N/A";
      row.insertCell().textContent = client.ContactPersonMiddleName || "-";
      row.insertCell().textContent = client.ContactPersonPhone || "N/A";
      row.insertCell().textContent = client.ContactPersonEmail || "-";
      row.insertCell().textContent = client.CooperationStartDate
        ? new Date(client.CooperationStartDate).toLocaleDateString("uk-UA")
        : "N/A";

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";

      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(client));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteClient(
          client.ClientID,
          client.ClientCompanyName ||
            `${client.ContactPersonLastName || ""} ${
              client.ContactPersonFirstName || ""
            }`.trim()
        )
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  function showLoader() {
    if (clientsLoader) clientsLoader.style.display = "block";
    if (clientsError) clientsError.style.display = "none";
    if (clientsNoResults) clientsNoResults.style.display = "none";
  }
  function showError(message) {
    if (clientsLoader) clientsLoader.style.display = "none";
    if (clientsError) {
      clientsError.textContent = `Помилка: ${message}`;
      clientsError.style.display = "block";
    }
    if (clientsNoResults) clientsNoResults.style.display = "none";
  }
  function showNoResults() {
    if (clientsLoader) clientsLoader.style.display = "none";
    if (clientsError) clientsError.style.display = "none";
    if (clientsNoResults) clientsNoResults.style.display = "block";
  }
  function hideMessages() {
    if (clientsLoader) clientsLoader.style.display = "none";
    if (clientsError) clientsError.style.display = "none";
    if (clientsNoResults) clientsNoResults.style.display = "none";
  }

  function openModal(titleText = "Додати Клієнта", client = null) {
    if (
      !clientModal ||
      !clientForm ||
      !modalTitle ||
      !clientIdInput ||
      !clientFormMessage
    ) {
      console.error(
        "One or more modal elements are missing from the DOM for clients."
      );
      alert("Помилка: Не вдалося відкрити форму клієнта.");
      return;
    }
    modalTitle.textContent = titleText;
    clientForm.reset();
    clientIdInput.value = ""; // Для прихованого поля ID
    clientFormMessage.textContent = "";
    clientFormMessage.className = "form-message";

    if (client) {
      clientIdInput.value = client.ClientID;
      // Використовуємо clientForm.elements для доступу до полів за їх name атрибутом
      if (clientForm.elements.clientCompanyName)
        clientForm.elements.clientCompanyName.value =
          client.ClientCompanyName || "";
      if (clientForm.elements.contactPersonLastName)
        clientForm.elements.contactPersonLastName.value =
          client.ContactPersonLastName || "";
      if (clientForm.elements.contactPersonFirstName)
        clientForm.elements.contactPersonFirstName.value =
          client.ContactPersonFirstName || "";
      if (clientForm.elements.contactPersonMiddleName)
        clientForm.elements.contactPersonMiddleName.value =
          client.ContactPersonMiddleName || "";
      if (clientForm.elements.contactPersonPhone)
        clientForm.elements.contactPersonPhone.value =
          client.ContactPersonPhone || "";
      if (clientForm.elements.contactPersonEmail)
        clientForm.elements.contactPersonEmail.value =
          client.ContactPersonEmail || "";
      if (clientForm.elements.cooperationStartDate)
        clientForm.elements.cooperationStartDate.value =
          client.CooperationStartDate
            ? client.CooperationStartDate.split("T")[0]
            : "";
    }
    clientModal.classList.add("active");
  }

  function closeModal() {
    if (clientModal) clientModal.classList.remove("active");
  }
  function openModalForEdit(client) {
    openModal("Редагувати Клієнта", client);
  }

  // Обробник для поля телефону, щоб дозволити тільки цифри (та опціонально "+")
  if (contactPersonPhoneInput) {
    contactPersonPhoneInput.addEventListener("input", function (e) {
      let currentValue = e.target.value;
      let sanitizedValue = "";
      if (currentValue.startsWith("+")) {
        sanitizedValue = "+";
        currentValue = currentValue.substring(1);
      }
      sanitizedValue += currentValue.replace(/[^0-9]/g, "");
      e.target.value = sanitizedValue;
    });
  }

  if (addClientBtn) addClientBtn.addEventListener("click", () => openModal());
  if (closeModalButton) closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === clientModal) closeModal();
  });

  if (clientForm) {
    clientForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!clientFormMessage) return;
      clientFormMessage.textContent = "";
      clientFormMessage.className = "form-message";

      const id = clientIdInput.value;
      const isEditMode = !!id;

      // Отримуємо дані з форми напряму, оскільки FormData не потрібна, якщо немає файлів
      const phoneValueFromForm = clientForm.elements.contactPersonPhone
        ? clientForm.elements.contactPersonPhone.value
        : "";

      // Валідація телефону перед формуванням clientData
      if (phoneValueFromForm) {
        const phoneDigits = phoneValueFromForm.replace("+", "");
        if (
          phoneDigits.length > 0 &&
          (phoneDigits.length < 7 || phoneDigits.length > 15)
        ) {
          clientFormMessage.textContent =
            'Будь ласка, введіть коректний номер телефону (7-15 цифр, можливий "+" на початку).';
          clientFormMessage.classList.add("error");
          return;
        }
      }

      const clientData = {
        clientCompanyName: clientForm.elements.clientCompanyName
          ? clientForm.elements.clientCompanyName.value.trim() || null
          : null,
        contactPersonLastName: clientForm.elements.contactPersonLastName
          ? clientForm.elements.contactPersonLastName.value.trim()
          : "",
        contactPersonFirstName: clientForm.elements.contactPersonFirstName
          ? clientForm.elements.contactPersonFirstName.value.trim()
          : "",
        contactPersonMiddleName: clientForm.elements.contactPersonMiddleName
          ? clientForm.elements.contactPersonMiddleName.value.trim() || null
          : null,
        contactPersonPhone: phoneValueFromForm, // Вже очищене значення
        contactPersonEmail: clientForm.elements.contactPersonEmail
          ? clientForm.elements.contactPersonEmail.value.trim() || null
          : null,
        cooperationStartDate: clientForm.elements.cooperationStartDate
          ? clientForm.elements.cooperationStartDate.value
          : "",
      };

      if (
        !clientData.contactPersonLastName ||
        !clientData.contactPersonFirstName ||
        !clientData.contactPersonPhone || // Телефон тепер обов'язковий
        !clientData.cooperationStartDate
      ) {
        clientFormMessage.textContent =
          "Прізвище, Ім'я, Телефон контактної особи та Дата початку співпраці є обов'язковими.";
        clientFormMessage.classList.add("error");
        return;
      }

      const url = isEditMode ? `${API_URL_CLIENTS}/${id}` : API_URL_CLIENTS;
      const method = isEditMode ? "PUT" : "POST";

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clientData),
        });
        const result = await response
          .json()
          .catch(() => ({
            message: response.statusText || "Помилка обробки відповіді",
          }));

        if (response.ok) {
          clientFormMessage.textContent =
            result.message ||
            `Клієнта успішно ${isEditMode ? "оновлено" : "створено"}!`;
          clientFormMessage.classList.add("success");
          fetchAndDisplayClients(
            clientSearchInput ? clientSearchInput.value.trim() : ""
          );
          setTimeout(closeModal, 1500);
        } else {
          clientFormMessage.textContent =
            result.message ||
            `Помилка ${isEditMode ? "оновлення" : "створення"} клієнта.`;
          clientFormMessage.classList.add("error");
        }
      } catch (error) {
        console.error("Error saving client:", error);
        clientFormMessage.textContent =
          "Сталася помилка сервера при збереженні клієнта.";
        clientFormMessage.classList.add("error");
      }
    });
  }

  async function deleteClient(clientId, clientName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити клієнта "${clientName}" (ID: ${clientId})? Це може вплинути на пов'язані кампанії.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_CLIENTS}/${clientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {};
      if (response.status === 200 || response.status === 204) {
        // 204 No Content теж успіх
        try {
          if (
            response.headers.get("content-type")?.includes("application/json")
          ) {
            result = await response.json();
          } else {
            result.message = "Клієнта успішно видалено!";
          }
        } catch (e) {
          result.message = "Клієнта успішно видалено (відповідь не JSON).";
        }
      } else {
        try {
          result = await response.json();
        } catch (e) {
          result.message = `Помилка: ${response.statusText || response.status}`;
        }
      }

      alert(
        result.message ||
          (response.ok ? "Клієнта видалено" : "Помилка видалення")
      );
      if (response.ok) {
        fetchAndDisplayClients(
          clientSearchInput ? clientSearchInput.value.trim() : ""
        );
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  let searchTimeoutGlobal; // Змінив назву, щоб уникнути конфлікту з іншими файлами, якщо вони в одній області видимості
  if (clientSearchInput) {
    clientSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeoutGlobal);
      searchTimeoutGlobal = setTimeout(() => {
        fetchAndDisplayClients(clientSearchInput.value.trim());
      }, 500);
    });
  }

  if (token) {
    if (typeof fetchAndDisplayClients === "function") fetchAndDisplayClients();
  } else {
    showError("Необхідна авторизація для перегляду клієнтів.");
    // Додатково: приховати елементи керування
    if (addClientBtn) addClientBtn.style.display = "none";
    const mainContent = document.querySelector(
      ".content-area .content-header + .search-filter-bar, .content-area .table-responsive"
    );
    if (mainContent) mainContent.style.display = "none";
  }
});
