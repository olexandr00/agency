// frontend/js/admin/crud-employees.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_EMPLOYEES = "http://localhost:3000/api/employees";
  const API_URL_POSITIONS = "http://localhost:3000/api/positions";
  const token = Auth.getToken();
  const DEFAULT_AVATAR_PATH_ADMIN = "../assets/images/default-avatar.png";

  const employeesTableBody = document.getElementById("employeesTableBody");
  const employeesLoader = document.getElementById("employees-loader");
  const employeesError = document.getElementById("employees-error");
  const employeesNoResults = document.getElementById("employees-no-results");

  const addEmployeeBtn = document.getElementById("addEmployeeBtn");
  const employeeModal = document.getElementById("employeeModal");
  const closeModalButton = employeeModal
    ? employeeModal.querySelector(".close-modal-button")
    : null;
  const employeeForm = document.getElementById("employeeForm");
  const modalTitle = employeeModal
    ? employeeModal.querySelector("#modalTitle")
    : null;
  const employeeIdInput = document.getElementById("employeeId");
  const positionSelect = document.getElementById("positionId");
  const employeePhoneInput = document.getElementById("phone");
  const employeeFormMessage = document.getElementById("employee-form-message");
  const employeeSearchInput = document.getElementById("employeeSearchInput");

  const currentPhotoContainer = document.getElementById(
    "currentPhotoContainer"
  );
  const currentPhotoPreview = document.getElementById("currentPhotoPreview");
  const removePhotoCheckbox = document.getElementById("removePhotoCheckbox");
  const employeePhotoFileInput = document.getElementById("employeePhotoFile");

  async function loadPositions() {
    if (!positionSelect) {
      console.warn("Position select element not found.");
      return;
    }
    try {
      const response = await fetch(API_URL_POSITIONS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалося завантажити посади");
      const positions = await response.json();

      positionSelect.innerHTML = '<option value="">Оберіть посаду...</option>';
      positions.forEach((pos) => {
        const option = document.createElement("option");
        option.value = pos.PositionID;
        option.textContent = pos.PositionName;
        positionSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading positions:", error);
      positionSelect.innerHTML =
        '<option value="">Помилка завантаження посад</option>';
    }
  }

  async function fetchAndDisplayEmployees(searchTerm = "") {
    showLoader();
    try {
      let url = new URL(API_URL_EMPLOYEES);
      url.searchParams.append("all", "true"); // Завжди показувати всіх (включаючи звільнених) в адмінці

      if (searchTerm) {
        url.searchParams.append("search", searchTerm);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP Error ${response.status}` }));
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }
      const employeesData = await response.json();
      renderEmployeesTable(employeesData);
    } catch (error) {
      console.error("Error fetching employees:", error);
      showError(error.message);
    }
  }

  function renderEmployeesTable(employees) {
    hideMessages();
    if (!employeesTableBody) {
      console.error("employeesTableBody not found!");
      return;
    }
    employeesTableBody.innerHTML = "";

    if (!employees || employees.length === 0) {
      showNoResults();
      return;
    }

    employees.forEach((emp) => {
      const row = employeesTableBody.insertRow();
      if (emp.DismissalDate) {
        row.classList.add("dismissed-employee-row");
      }

      const photoCell = row.insertCell();
      const img = document.createElement("img");
      const photoSrc = emp.PhotoURL
        ? `http://localhost:3000${emp.PhotoURL}`
        : DEFAULT_AVATAR_PATH_ADMIN;
      img.src = photoSrc;
      img.alt = `${emp.LastName || ""} ${emp.FirstName || ""}`;
      img.className = "employee-photo-thumbnail";
      img.onerror = function () {
        this.src = DEFAULT_AVATAR_PATH_ADMIN;
      }; // Обробка помилки завантаження фото
      photoCell.appendChild(img);

      row.insertCell().textContent = emp.LastName || "N/A";
      row.insertCell().textContent = emp.FirstName || "N/A";
      row.insertCell().textContent =
        emp.PositionName ||
        (emp.PositionID ? `(ID посади: ${emp.PositionID})` : "Не вказано");
      row.insertCell().textContent = emp.Phone || "N/A";
      const statusCell = row.insertCell();
      if (emp.DismissalDate) {
        statusCell.textContent = `Звільн. ${new Date(
          emp.DismissalDate
        ).toLocaleDateString("uk-UA")}`;
        statusCell.style.color = "var(--danger-color)";
      } else {
        statusCell.textContent = "Активний";
        statusCell.style.color = "var(--success-color)";
      }

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";
      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(emp));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteEmployee(
          emp.EmployeeID,
          `${emp.LastName || ""} ${emp.FirstName || ""}`
        )
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  function showLoader() {
    if (employeesLoader) employeesLoader.style.display = "block";
    if (employeesError) employeesError.style.display = "none";
    if (employeesNoResults) employeesNoResults.style.display = "none";
  }
  function showError(message) {
    if (employeesLoader) employeesLoader.style.display = "none";
    if (employeesError) {
      employeesError.textContent = `Помилка: ${message}`;
      employeesError.style.display = "block";
    }
    if (employeesNoResults) employeesNoResults.style.display = "none";
  }
  function showNoResults() {
    if (employeesLoader) employeesLoader.style.display = "none";
    if (employeesError) employeesError.style.display = "none";
    if (employeesNoResults) employeesNoResults.style.display = "block";
  }
  function hideMessages() {
    if (employeesLoader) employeesLoader.style.display = "none";
    if (employeesError) employeesError.style.display = "none";
    if (employeesNoResults) employeesNoResults.style.display = "none";
  }

  function openModal(titleText = "Додати Працівника", employee = null) {
    if (
      !employeeModal ||
      !employeeForm ||
      !modalTitle ||
      !employeeIdInput ||
      !employeeFormMessage ||
      !currentPhotoPreview ||
      !currentPhotoContainer ||
      !removePhotoCheckbox ||
      !employeePhotoFileInput ||
      !positionSelect
    ) {
      console.error("One or more modal elements are missing from the DOM.");
      alert("Помилка: Не вдалося відкрити модальне вікно. Відсутні елементи.");
      return;
    }
    modalTitle.textContent = titleText;
    employeeForm.reset();
    employeePhotoFileInput.value = "";
    employeeIdInput.value = "";
    employeeFormMessage.textContent = "";
    employeeFormMessage.className = "form-message";
    currentPhotoPreview.src = "#";
    currentPhotoContainer.style.display = "none";
    removePhotoCheckbox.checked = false;

    if (employee) {
      employeeIdInput.value = employee.EmployeeID;
      if (employeeForm.elements.lastName)
        employeeForm.elements.lastName.value = employee.LastName || "";
      if (employeeForm.elements.firstName)
        employeeForm.elements.firstName.value = employee.FirstName || "";
      if (employeeForm.elements.middleName)
        employeeForm.elements.middleName.value = employee.MiddleName || "";
      if (positionSelect) positionSelect.value = employee.PositionID || "";
      if (employeeForm.elements.phone)
        employeeForm.elements.phone.value = employee.Phone || "";
      if (employeeForm.elements.email)
        employeeForm.elements.email.value = employee.Email || "";
      if (employeeForm.elements.hireDate)
        employeeForm.elements.hireDate.value = employee.HireDate
          ? employee.HireDate.split("T")[0]
          : "";
      if (employeeForm.elements.salary)
        employeeForm.elements.salary.value =
          employee.Salary !== null && employee.Salary !== undefined
            ? parseFloat(employee.Salary).toFixed(2)
            : "";
      if (employeeForm.elements.dismissalDate)
        employeeForm.elements.dismissalDate.value = employee.DismissalDate
          ? employee.DismissalDate.split("T")[0]
          : "";

      if (employee.PhotoURL) {
        currentPhotoPreview.src = `http://localhost:3000${
          employee.PhotoURL
        }?t=${new Date().getTime()}`; // Додаємо timestamp для уникнення кешування
        currentPhotoPreview.onerror = function () {
          this.src = DEFAULT_AVATAR_PATH_ADMIN;
        };
        currentPhotoContainer.style.display = "block";
      } else {
        currentPhotoPreview.src = DEFAULT_AVATAR_PATH_ADMIN; // Показуємо дефолт, якщо фото немає
        currentPhotoContainer.style.display = "block";
      }
    } else {
      // Для нового працівника показуємо дефолтний аватар
      currentPhotoPreview.src = DEFAULT_AVATAR_PATH_ADMIN;
      currentPhotoContainer.style.display = "block";
    }
    employeeModal.classList.add("active");
  }

  function closeModal() {
    if (employeeModal) employeeModal.classList.remove("active");
  }
  function openModalForEdit(employee) {
    openModal("Редагувати Працівника", employee);
  }

  // Обробник для поля телефону, щоб дозволити тільки цифри (та опціонально "+")
  if (employeePhoneInput) {
    employeePhoneInput.addEventListener("input", function (e) {
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

  if (addEmployeeBtn)
    addEmployeeBtn.addEventListener("click", () => openModal());
  if (closeModalButton) closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === employeeModal) closeModal();
  });

  if (employeeForm) {
    employeeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!employeeFormMessage) return;
      employeeFormMessage.textContent = "";
      employeeFormMessage.className = "form-message";

      const id = employeeIdInput.value;
      const isEditMode = !!id;
      const formData = new FormData(employeeForm);

      // Додаємо removePhoto, якщо чекбокс відмічено
      if (removePhotoCheckbox && removePhotoCheckbox.checked) {
        formData.append("removePhoto", "true");
      }

      const phoneValue = formData.get("phone");
      if (phoneValue) {
        const phoneDigits = phoneValue.replace("+", "");
        if (
          phoneDigits.length > 0 &&
          (phoneDigits.length < 7 || phoneDigits.length > 15)
        ) {
          employeeFormMessage.textContent =
            'Будь ласка, введіть коректний номер телефону (7-15 цифр, можливий "+" на початку).';
          employeeFormMessage.classList.add("error");
          return;
        }
      }

      if (
        !formData.get("lastName") ||
        !formData.get("firstName") ||
        !formData.get("positionId") ||
        !formData.get("phone") ||
        !formData.get("hireDate") ||
        formData.get("salary") === ""
      ) {
        employeeFormMessage.textContent =
          "Прізвище, Ім'я, Посада, Телефон, Дата прийому та Зарплата є обов'язковими.";
        employeeFormMessage.classList.add("error");
        return;
      }
      const salaryValue = parseFloat(formData.get("salary"));
      if (isNaN(salaryValue) || salaryValue < 0) {
        employeeFormMessage.textContent =
          "Зарплата має бути невід'ємним числом.";
        employeeFormMessage.classList.add("error");
        return;
      }
      // Перевірка дат
      const hireDate = formData.get("hireDate");
      const dismissalDate = formData.get("dismissalDate");
      if (
        hireDate &&
        dismissalDate &&
        new Date(dismissalDate) < new Date(hireDate)
      ) {
        employeeFormMessage.textContent =
          "Дата звільнення не може бути раніше дати прийому на роботу.";
        employeeFormMessage.classList.add("error");
        return;
      }

      const url = isEditMode ? `${API_URL_EMPLOYEES}/${id}` : API_URL_EMPLOYEES;
      const method = isEditMode ? "PUT" : "POST";

      try {
        const response = await fetch(url, {
          method: method,
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json().catch(() => ({
          message: response.statusText || "Помилка обробки відповіді сервера",
        }));

        if (response.ok) {
          employeeFormMessage.textContent =
            result.message ||
            `Працівника успішно ${isEditMode ? "оновлено" : "створено"}!`;
          employeeFormMessage.classList.add("success");
          fetchAndDisplayEmployees(
            employeeSearchInput ? employeeSearchInput.value.trim() : ""
          );
          setTimeout(closeModal, 1500);
        } else {
          employeeFormMessage.textContent =
            result.message ||
            `Помилка ${isEditMode ? "оновлення" : "створення"} працівника.`;
          employeeFormMessage.classList.add("error");
        }
      } catch (error) {
        console.error("Error saving employee:", error);
        employeeFormMessage.textContent =
          "Сталася помилка сервера при збереженні працівника.";
        employeeFormMessage.classList.add("error");
      }
    });
  }

  async function deleteEmployee(employeeId, employeeName) {
    if (
      !confirm(`Ви впевнені, що хочете видалити працівника "${employeeName}"?`)
    )
      return;
    try {
      const response = await fetch(`${API_URL_EMPLOYEES}/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        result = await response.json().catch(() => ({}));
      } else {
        result.message = response.ok
          ? "Працівника успішно видалено!"
          : `Помилка: ${response.statusText}`;
      }
      if (response.ok) {
        alert(result.message || "Працівника успішно видалено!");
        fetchAndDisplayEmployees(
          employeeSearchInput ? employeeSearchInput.value.trim() : ""
        );
      } else {
        alert(
          `Помилка видалення: ${
            result.message || "Не вдалося видалити працівника."
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  let searchTimeout;
  if (employeeSearchInput) {
    employeeSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchAndDisplayEmployees(employeeSearchInput.value.trim());
      }, 500);
    });
  }

  if (token) {
    if (typeof loadPositions === "function") loadPositions();
    if (typeof fetchAndDisplayEmployees === "function")
      fetchAndDisplayEmployees();
  } else {
    showError("Необхідна авторизація для перегляду працівників.");
    if (addEmployeeBtn) addEmployeeBtn.style.display = "none";
    const mainContent = document.querySelector(
      ".content-area .content-header + .search-filter-bar, .content-area .table-responsive"
    );
    if (mainContent) mainContent.style.display = "none";
  }
});
