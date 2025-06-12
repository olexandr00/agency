// frontend/js/admin/crud-positions.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_POSITIONS = "http://localhost:3000/api/positions";
  const token = Auth.getToken();

  const positionsTableBody = document.getElementById("positionsTableBody");
  const positionsLoader = document.getElementById("positions-loader");
  const positionsError = document.getElementById("positions-error");
  const positionsNoResults = document.getElementById("positions-no-results");

  const addPositionBtn = document.getElementById("addPositionBtn");
  const positionModal = document.getElementById("positionModal");
  const closeModalButton = positionModal.querySelector(".close-modal-button");
  const positionForm = document.getElementById("positionForm");
  const modalTitle = positionModal.querySelector("#modalTitle");
  const positionIdInput = document.getElementById("positionId");
  const positionFormMessage = document.getElementById("position-form-message");
  const positionSearchInput = document.getElementById("positionSearchInput");

  let currentPositions = [];

  // --- Завантаження та відображення посад ---
  async function fetchAndDisplayPositions(searchTerm = "") {
    showLoader();
    try {
      let url = API_URL_POSITIONS;
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
      currentPositions = await response.json();
      renderPositionsTable(currentPositions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      showError(error.message);
    }
  }

  function renderPositionsTable(positions) {
    hideMessages();
    positionsTableBody.innerHTML = "";

    if (positions.length === 0) {
      showNoResults();
      return;
    }

    positions.forEach((position) => {
      const row = positionsTableBody.insertRow();

      row.insertCell().textContent = position.PositionName;

      const descriptionCell = row.insertCell();
      descriptionCell.textContent = position.PositionDescription
        ? position.PositionDescription.length > 70
          ? position.PositionDescription.substring(0, 70) + "..."
          : position.PositionDescription
        : "-";
      descriptionCell.title = position.PositionDescription || "";

      const rateCell = row.insertCell();
      rateCell.textContent =
        position.BasePositionRate !== null &&
        position.BasePositionRate !== undefined
          ? parseFloat(position.BasePositionRate).toFixed(2)
          : "-";
      rateCell.style.textAlign = "right";

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";

      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(position));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deletePosition(position.PositionID, position.PositionName)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  // Показ/приховування повідомлень
  function showLoader() {
    positionsLoader.style.display = "block";
    positionsError.style.display = "none";
    positionsNoResults.style.display = "none";
  }
  function showError(message) {
    positionsLoader.style.display = "none";
    positionsError.textContent = `Помилка: ${message}`;
    positionsError.style.display = "block";
    positionsNoResults.style.display = "none";
  }
  function showNoResults() {
    positionsLoader.style.display = "none";
    positionsError.style.display = "none";
    positionsNoResults.style.display = "block";
  }
  function hideMessages() {
    positionsLoader.style.display = "none";
    positionsError.style.display = "none";
    positionsNoResults.style.display = "none";
  }

  // --- Модальне вікно та форма ---
  function openModal(title = "Додати Посаду", position = null) {
    modalTitle.textContent = title;
    positionForm.reset();
    positionIdInput.value = "";
    positionFormMessage.textContent = "";
    positionFormMessage.className = "form-message";

    if (position) {
      positionIdInput.value = position.PositionID;
      positionForm.positionName.value = position.PositionName;
      positionForm.positionDescription.value =
        position.PositionDescription || "";
      positionForm.basePositionRate.value =
        position.BasePositionRate !== null &&
        position.BasePositionRate !== undefined
          ? parseFloat(position.BasePositionRate).toFixed(2)
          : "";
    }
    positionModal.classList.add("active");
  }

  function closeModal() {
    positionModal.classList.remove("active");
  }

  function openModalForEdit(position) {
    openModal("Редагувати Посаду", position);
  }

  addPositionBtn.addEventListener("click", () => openModal());
  closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === positionModal) {
      closeModal();
    }
  });

  // Обробка відправки форми
  positionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    positionFormMessage.textContent = "";
    positionFormMessage.className = "form-message";

    const id = positionIdInput.value;
    const isEditMode = !!id;

    const positionData = {
      positionName: positionForm.positionName.value,
      positionDescription: positionForm.positionDescription.value,
      basePositionRate: positionForm.basePositionRate.value
        ? parseFloat(positionForm.basePositionRate.value)
        : null,
    };

    if (!positionData.positionName) {
      positionFormMessage.textContent = "Назва посади є обов'язковою.";
      positionFormMessage.classList.add("error");
      return;
    }
    if (
      positionData.basePositionRate !== null &&
      (isNaN(positionData.basePositionRate) ||
        positionData.basePositionRate < 0)
    ) {
      positionFormMessage.textContent =
        "Базова ставка має бути невід'ємним числом або порожньою.";
      positionFormMessage.classList.add("error");
      return;
    }

    const url = isEditMode ? `${API_URL_POSITIONS}/${id}` : API_URL_POSITIONS;
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(positionData),
      });
      const result = await response.json();

      if (response.ok) {
        positionFormMessage.textContent =
          result.message ||
          `Посаду успішно ${isEditMode ? "оновлено" : "створено"}!`;
        positionFormMessage.classList.add("success");
        fetchAndDisplayPositions(positionSearchInput.value.trim());
        setTimeout(() => {
          closeModal();
        }, 1500);
      } else {
        positionFormMessage.textContent =
          result.message ||
          `Помилка ${isEditMode ? "оновлення" : "створення"} посади.`;
        positionFormMessage.classList.add("error");
      }
    } catch (error) {
      console.error("Error saving position:", error);
      positionFormMessage.textContent = "Сталася помилка сервера.";
      positionFormMessage.classList.add("error");
    }
  });

  // Видалення посади
  async function deletePosition(positionId, positionName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити посаду "${positionName}"? Це може вплинути на працівників, які займають цю посаду.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_POSITIONS}/${positionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      } else {
        if (response.ok)
          result.message = "Посаду успішно видалено (no JSON response)!";
        else result.message = `Помилка: ${response.statusText}`;
      }

      if (response.ok) {
        alert(result.message || "Посаду успішно видалено!");
        fetchAndDisplayPositions(positionSearchInput.value.trim());
      } else {
        alert(
          `Помилка видалення: ${
            result.message || "Не вдалося видалити посаду."
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting position:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  // Пошук
  let searchTimeout;
  positionSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayPositions(positionSearchInput.value.trim());
    }, 500);
  });

  // Початкове завантаження
  if (token) {
    fetchAndDisplayPositions();
  } else {
    showError("Необхідна авторизація для перегляду посад.");
  }
});
