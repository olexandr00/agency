// frontend/js/admin/crud-messages.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_MESSAGES = "http://localhost:3000/api/contact-messages";
  const token = Auth.getToken();

  const messagesTableBody = document.getElementById("messagesTableBody");
  const messagesLoader = document.getElementById("messages-loader");
  const messagesError = document.getElementById("messages-error");
  const messagesNoResults = document.getElementById("messages-no-results");

  const messageSearchInput = document.getElementById("messageSearchInput");
  const readStatusFilter = document.getElementById("readStatusFilter");

  // Елементи модального вікна
  const messageModal = document.getElementById("messageModal");
  const closeModalButton = messageModal.querySelector(".close-modal-button");
  const messageIdHiddenInput = document.getElementById("messageIdHidden");
  const modalMessageSenderName = document.getElementById(
    "modalMessageSenderName"
  );
  const modalMessageSenderEmail = document.getElementById(
    "modalMessageSenderEmail"
  );
  const modalMessageSenderPhone = document.getElementById(
    "modalMessageSenderPhone"
  );
  const modalMessageSubject = document.getElementById("modalMessageSubject");
  const modalMessageDate = document.getElementById("modalMessageDate");
  const modalMessageStatusText = document.getElementById(
    "modalMessageStatusText"
  );
  const modalMessageTextDisplay = document.getElementById(
    "modalMessageTextDisplay"
  );
  const messageStatusForm = document.getElementById("messageStatusForm");
  const modalMessageReadStatusSelect = document.getElementById(
    "modalMessageReadStatus"
  );
  const messageFormMessage = document.getElementById("message-form-message");

  let currentMessages = [];

  // --- Завантаження та відображення повідомлень ---
  async function fetchAndDisplayMessages() {
    showLoader();
    const searchTerm = messageSearchInput.value.trim();
    const isRead = readStatusFilter.value; // '1', '0', or ''

    try {
      let url = new URL(API_URL_MESSAGES);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (isRead !== "") url.searchParams.append("isRead", isRead);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }
      currentMessages = await response.json();
      renderMessagesTable(currentMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      showError(error.message);
    }
  }

  function renderMessagesTable(messages) {
    hideMessages();
    messagesTableBody.innerHTML = "";

    if (messages.length === 0) {
      showNoResults();
      return;
    }

    messages.forEach((msg) => {
      const row = messagesTableBody.insertRow();
      if (!msg.IsRead) {
        // Якщо не прочитано, робимо рядок жирнішим
        row.style.fontWeight = "bold";
      }

      row.insertCell().textContent = msg.SenderName;
      row.insertCell().textContent = msg.SenderEmail;
      row.insertCell().textContent = msg.SenderPhone || "-";
      row.insertCell().textContent = msg.MessageSubject || "-";

      const textCell = row.insertCell();
      textCell.textContent =
        msg.MessageText.length > 40
          ? msg.MessageText.substring(0, 40) + "..."
          : msg.MessageText;
      textCell.title = msg.MessageText;
      textCell.classList.add("message-text-cell");

      row.insertCell().textContent = new Date(
        msg.SubmissionDate
      ).toLocaleString("uk-UA");

      const statusCell = row.insertCell();
      statusCell.textContent = msg.IsRead ? "Прочитано" : "Непрочитано";
      statusCell.className = msg.IsRead ? "status-read" : "status-unread";

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";

      const detailsButton = document.createElement("button");
      detailsButton.className = "button button-small button-edit";
      detailsButton.textContent = "Деталі";
      detailsButton.addEventListener("click", () => openMessageModal(msg));
      actionsCell.appendChild(detailsButton);

      const toggleReadButton = document.createElement("button");
      toggleReadButton.className = `button button-small ${
        msg.IsRead ? "button-secondary" : "button-primary"
      }`;
      toggleReadButton.textContent = msg.IsRead
        ? "Як непрочитане"
        : "Як прочитане";
      toggleReadButton.addEventListener("click", () =>
        toggleReadStatus(msg.MessageID, !msg.IsRead)
      );
      actionsCell.appendChild(toggleReadButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteMessage(msg.MessageID, msg.SenderName)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  // Показ/приховування повідомлень
  function showLoader() {
    /* ... */ messagesLoader.style.display = "block";
    messagesError.style.display = "none";
    messagesNoResults.style.display = "none";
  }
  function showError(message) {
    /* ... */ messagesLoader.style.display = "none";
    messagesError.textContent = `Помилка: ${message}`;
    messagesError.style.display = "block";
    messagesNoResults.style.display = "none";
  }
  function showNoResults() {
    /* ... */ messagesLoader.style.display = "none";
    messagesError.style.display = "none";
    messagesNoResults.style.display = "block";
  }
  function hideMessages() {
    /* ... */ messagesLoader.style.display = "none";
    messagesError.style.display = "none";
    messagesNoResults.style.display = "none";
  }

  // Модальне вікно для деталей та зміни статусу
  let currentViewingMessageId = null;
  async function openMessageModal(message) {
    currentViewingMessageId = message.MessageID;
    messageFormMessage.textContent = "";
    messageFormMessage.className = "form-message";

    // Позначити як прочитане при відкритті, якщо ще не прочитано
    if (!message.IsRead) {
      try {
        await fetch(`${API_URL_MESSAGES}/${message.MessageID}/read`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ read: true }),
        });
        message.IsRead = 1; // Оновити локально для відображення в модалці
        fetchAndDisplayMessages(); // Оновити таблицю, щоб статус змінився
      } catch (err) {
        console.error("Failed to mark message as read on open:", err);
      }
    }

    messageIdHiddenInput.value = message.MessageID;
    modalMessageSenderName.textContent = message.SenderName;
    modalMessageSenderEmail.textContent = message.SenderEmail;
    modalMessageSenderPhone.textContent = message.SenderPhone || "Не вказано";
    modalMessageSubject.textContent = message.MessageSubject || "Без теми";
    modalMessageDate.textContent = new Date(
      message.SubmissionDate
    ).toLocaleString("uk-UA", { dateStyle: "long", timeStyle: "short" });
    modalMessageStatusText.textContent = message.IsRead
      ? "Прочитано"
      : "Непрочитано";
    modalMessageTextDisplay.textContent = message.MessageText;
    modalMessageReadStatusSelect.value = message.IsRead ? "1" : "0";

    messageModal.classList.add("active");
  }

  closeModalButton.addEventListener("click", () =>
    messageModal.classList.remove("active")
  );
  window.addEventListener("click", (event) => {
    if (event.target === messageModal) {
      messageModal.classList.remove("active");
    }
  });

  // Збереження нового статусу прочитання з модального вікна
  messageStatusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentViewingMessageId) return;

    const newReadStatus = modalMessageReadStatusSelect.value === "1";
    await updateReadStatus(currentViewingMessageId, newReadStatus, true); // true - для закриття модалки
  });

  // Зміна статусу
  async function updateReadStatus(
    messageId,
    newReadStatus,
    closeModalAfter = false
  ) {
    messageFormMessage.textContent = ""; // Для модалки
    messageFormMessage.className = "form-message";
    try {
      const response = await fetch(`${API_URL_MESSAGES}/${messageId}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ read: newReadStatus }),
      });
      const result = await response.json();

      if (response.ok) {
        if (closeModalAfter) {
          messageFormMessage.textContent =
            result.message || "Статус повідомлення оновлено!";
          messageFormMessage.classList.add("success");
        } else {
          alert(result.message || "Статус повідомлення оновлено!");
        }
        fetchAndDisplayMessages(); // Оновити таблицю
        if (closeModalAfter) {
          setTimeout(() => messageModal.classList.remove("active"), 1500);
        }
      } else {
        if (closeModalAfter) {
          messageFormMessage.textContent =
            result.message || "Помилка оновлення статусу.";
          messageFormMessage.classList.add("error");
        } else {
          alert(`Помилка: ${result.message || "Не вдалося змінити статус."}`);
        }
      }
    } catch (error) {
      console.error("Error updating read status:", error);
      if (closeModalAfter) {
        messageFormMessage.textContent = "Сталася помилка сервера.";
        messageFormMessage.classList.add("error");
      } else {
        alert("Сталася помилка сервера.");
      }
    }
  }

  function toggleReadStatus(messageId, newReadStatus) {
    // Для кнопки в таблиці
    const actionText = newReadStatus
      ? "позначити як прочитане"
      : "позначити як непрочитане";
    if (!confirm(`Ви впевнені, що хочете ${actionText} це повідомлення?`)) {
      return;
    }
    updateReadStatus(messageId, newReadStatus, false);
  }

  // Видалення повідомлення
  async function deleteMessage(messageId, senderName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити повідомлення від "${senderName}"?`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_MESSAGES}/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json();
      } else {
        if (response.ok) result.message = "Повідомлення успішно видалено!";
        else result.message = `Помилка: ${response.statusText}`;
      }

      if (response.ok) {
        alert(result.message || "Повідомлення успішно видалено!");
        fetchAndDisplayMessages();
      } else {
        alert(
          `Помилка видалення: ${
            result.message || "Не вдалося видалити повідомлення."
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }
  // Фільтри та Пошук
  messageSearchInput.addEventListener("input", () => fetchAndDisplayMessages());
  readStatusFilter.addEventListener("change", () => fetchAndDisplayMessages());

  // Початкове завантаження
  if (token) {
    fetchAndDisplayMessages();
  } else {
    showError("Необхідна авторизація для перегляду повідомлень.");
  }
});
