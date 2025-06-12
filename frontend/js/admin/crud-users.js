// frontend/js/admin/crud-users.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_USERS = "http://localhost:3000/api/users";
  const token = Auth.getToken();

  const usersTableBody = document.getElementById("usersTableBody");
  const usersLoader = document.getElementById("users-loader");
  const usersError = document.getElementById("users-error");
  const usersNoResults = document.getElementById("users-no-results");

  const addUserBtn = document.getElementById("addUserBtn");
  const userModal = document.getElementById("userModal");
  const closeModalButton = userModal.querySelector(".close-modal-button");
  const userForm = document.getElementById("userForm");
  const modalTitle = document.getElementById("modalTitle");
  const userIdInput = document.getElementById("userId");
  const userFormMessage = document.getElementById("user-form-message");
  const userSearchInput = document.getElementById("userSearchInput");

  let currentUsers = [];

  // Завантаження та відображення користувачів
  async function fetchAndDisplayUsers(searchTerm = "") {
    showLoader();
    try {
      let url = API_URL_USERS;
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
      currentUsers = await response.json();
      renderUsersTable(currentUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      showError(error.message);
    }
  }

  function renderUsersTable(users) {
    hideMessages();
    usersTableBody.innerHTML = ""; // Очистити таблицю

    if (users.length === 0) {
      showNoResults();
      return;
    }

    users.forEach((user) => {
      const row = usersTableBody.insertRow();
      row.insertCell().textContent = user.Username;
      row.insertCell().textContent = user.Email;
      row.insertCell().textContent = user.Role;
      row.insertCell().textContent = new Date(
        user.RegistrationDate
      ).toLocaleDateString("uk-UA");

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";

      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(user));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteUser(user.UserID, user.Username)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  //  Показ/приховування повідомлень
  function showLoader() {
    usersLoader.style.display = "block";
    usersError.style.display = "none";
    usersNoResults.style.display = "none";
  }
  function showError(message) {
    usersLoader.style.display = "none";
    usersError.textContent = `Помилка: ${message}`;
    usersError.style.display = "block";
    usersNoResults.style.display = "none";
  }
  function showNoResults() {
    usersLoader.style.display = "none";
    usersError.style.display = "none";
    usersNoResults.style.display = "block";
  }
  function hideMessages() {
    usersLoader.style.display = "none";
    usersError.style.display = "none";
    usersNoResults.style.display = "none";
  }

  // Модальне вікно та форма
  function openModal(title = "Додати Користувача", user = null) {
    modalTitle.textContent = title;
    userForm.reset();
    userIdInput.value = "";
    userFormMessage.textContent = "";
    userFormMessage.className = "form-message";

    if (user) {
      // Якщо редагування, заповнити форму
      userIdInput.value = user.UserID;
      userForm.username.value = user.Username;
      userForm.email.value = user.Email;
      userForm.role.value = user.Role;
      // Пароль залишаємо порожнім для редагування (щоб не змінювати, якщо не потрібно)
      userForm.password.placeholder = "Залиште порожнім, щоб не змінювати";
    } else {
      userForm.password.placeholder = "";
    }
    userModal.classList.add("active");
  }

  function closeModal() {
    userModal.classList.remove("active");
  }

  function openModalForEdit(user) {
    openModal("Редагувати Користувача", user);
  }

  addUserBtn.addEventListener("click", () => openModal());
  closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    // Закриття по кліку поза модальним вікном
    if (event.target === userModal) {
      closeModal();
    }
  });

  // Обробка відправки форми
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    userFormMessage.textContent = "";
    userFormMessage.className = "form-message";

    const id = userIdInput.value;
    const isEditMode = !!id;

    const userData = {
      username: userForm.username.value,
      email: userForm.email.value,
      role: userForm.role.value,
    };
    // Додаємо пароль тільки якщо він введений
    if (userForm.password.value) {
      if (userForm.password.value.length < 6) {
        userFormMessage.textContent = "Пароль має бути не менше 6 символів.";
        userFormMessage.classList.add("error");
        return;
      }
      userData.password = userForm.password.value;
    } else if (!isEditMode) {
      // Пароль обов'язковий при створенні
      userFormMessage.textContent =
        "Пароль є обов'язковим для нового користувача.";
      userFormMessage.classList.add("error");
      return;
    }

    const url = isEditMode ? `${API_URL_USERS}/${id}` : API_URL_USERS;
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
      const result = await response.json();

      if (response.ok) {
        userFormMessage.textContent =
          result.message ||
          `Користувача успішно ${isEditMode ? "оновлено" : "створено"}!`;
        userFormMessage.classList.add("success");
        fetchAndDisplayUsers(userSearchInput.value.trim()); // Оновити таблицю
        setTimeout(() => {
          closeModal();
        }, 1500); // Закрити модальне через 1.5с
      } else {
        userFormMessage.textContent =
          result.message ||
          `Помилка ${isEditMode ? "оновлення" : "створення"} користувача.`;
        userFormMessage.classList.add("error");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      userFormMessage.textContent = "Сталася помилка сервера.";
      userFormMessage.classList.add("error");
    }
  });

  // Видалення користувача
  async function deleteUser(userId, username) {
    if (
      !confirm(`Ви впевнені, що хочете видалити користувача "${username}"?`)
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_USERS}/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (response.ok) {
        alert(result.message || "Користувача успішно видалено!");
        fetchAndDisplayUsers(userSearchInput.value.trim()); // Оновити таблицю
      } else {
        alert(
          `Помилка видалення: ${
            result.message || "Не вдалося видалити користувача."
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  // Пошук
  let searchTimeout;
  userSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayUsers(userSearchInput.value.trim());
    }, 500); // Затримка для уникнення частих запитів
  });

  // Початкове завантаження
  if (token) {
    // Перевірка, чи є токен перед завантаженням
    fetchAndDisplayUsers();
  } else {
    showError("Необхідна авторизація для перегляду користувачів.");
  }
});
