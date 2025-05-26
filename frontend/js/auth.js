// frontend/js/auth.js
const Auth = {
  apiUrl: "http://localhost:3000/api/auth",

  init: function () {
    this.protectAdminRoutes();
    this.updateAuthUI();

    if (window.location.pathname.includes("login.html")) {
      this.initLoginForm();
    }
    if (window.location.pathname.includes("register.html")) {
      this.initRegisterForm();
    }
  },

  getToken: function () {
    return localStorage.getItem("authToken");
  },
  getUser: function () {
    const user = localStorage.getItem("authUser");
    return user ? JSON.parse(user) : null;
  },
  isLoggedIn: function () {
    return !!this.getToken();
  },

  saveAuthData: function (token, user) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
    this.updateAuthUI();
  },

  logout: function () {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    this.updateAuthUI();
    if (window.location.pathname.includes("/admin/")) {
      window.location.href = "../index.html";
    } else if (
      window.location.pathname !== "/" &&
      !window.location.pathname.endsWith("/index.html")
    ) {
      // window.location.href = 'index.html';
    }
  },

  updateAuthUI: function () {
    const authLinksContainer = document.getElementById("auth-links-container");
    const adminLinkFooter = document.getElementById("admin-link");

    if (authLinksContainer) {
      if (this.isLoggedIn()) {
        const user = this.getUser();
        authLinksContainer.innerHTML = `
                    <span class="nav-username">Вітаємо, ${user.username}!</span>
                    <button id="logout-button" class="nav-logout-button">Вихід</button>
                `;
        const logoutButton = document.getElementById("logout-button");
        if (logoutButton) {
          logoutButton.addEventListener("click", () => this.logout());
        }
        if (adminLinkFooter) {
          adminLinkFooter.style.display =
            user.role === "admin" ? "inline" : "none";
        }
      } else {
        let loginClass = window.location.pathname.includes("login.html")
          ? "active"
          : "";
        let registerClass = window.location.pathname.includes("register.html")
          ? "active"
          : "";
        authLinksContainer.innerHTML = `<a href="login.html" class="${loginClass}">Вхід</a> <a href="register.html" class="${registerClass}">Реєстрація</a>`;
        if (adminLinkFooter) {
          adminLinkFooter.style.display = "none";
        }
      }
    }
  },

  initLoginForm: function () {
    const loginForm = document.getElementById("login-form");
    const messageElement = document.getElementById("login-message");
    if (loginForm && messageElement) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        messageElement.textContent = "";
        messageElement.className = "form-message";
        const email = loginForm.email.value;
        const password = loginForm.password.value;
        try {
          const response = await fetch(`${this.apiUrl}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          if (response.ok) {
            this.saveAuthData(data.token, data.user);
            messageElement.textContent = "Вхід успішний! Перенаправлення...";
            messageElement.classList.add("success");
            if (data.user.role === "admin") {
              window.location.href = "admin/dashboard.html";
            } else {
              window.location.href = "index.html";
            }
          } else {
            messageElement.textContent =
              data.message || "Помилка входу. Перевірте дані.";
            messageElement.classList.add("error");
          }
        } catch (error) {
          console.error("Login error:", error);
          messageElement.textContent =
            "Сталася помилка сервера. Спробуйте пізніше.";
          messageElement.classList.add("error");
        }
      });
    }
  },

  validatePasswordStrength: function (password) {
    const errors = [];
    const MIN_LENGTH = 8;

    if (password.length < MIN_LENGTH) {
      errors.push(`Мінімум ${MIN_LENGTH} символів.`);
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Мінімум одну малу літеру (a-z).");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Мінімум одну велику літеру (A-Z).");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Мінімум одну цифру (0-9).");
    }
    // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password)) { // Опціонально
    //     errors.push("Мінімум один спеціальний символ.");
    // }
    return errors;
  },

  initRegisterForm: function () {
    const registerForm = document.getElementById("register-form");
    const messageElement = document.getElementById("register-message");
    const passwordInput = document.getElementById("password");

    if (!registerForm || !messageElement || !passwordInput) {
      // console.warn("Register form elements not found. Skipping initRegisterForm.");
      return;
    }

    const passwordRequirementsHTML = `
            <div id="password-requirements" class="password-requirements-tooltip" style="display:none;">
                Пароль має містити:
                <ul>
                    <li id="req-length">Мінімум 8 символів</li>
                    <li id="req-lowercase">Мінімум одну малу літеру (a-z)</li>
                    <li id="req-uppercase">Мінімум одну велику літеру (A-Z)</li>
                    <li id="req-number">Мінімум одну цифру (0-9)</li>
                </ul>
            </div>
        `;
    // Вставляємо підказку тільки якщо її ще немає
    if (!document.getElementById("password-requirements")) {
      passwordInput.insertAdjacentHTML("afterend", passwordRequirementsHTML);
    }
    const requirementsTooltip = document.getElementById(
      "password-requirements"
    );

    const updatePasswordRequirementsUI = () => {
      if (requirementsTooltip) {
        const value = passwordInput.value;
        const MIN_LENGTH = 8;
        document.getElementById("req-length").style.color =
          value.length >= MIN_LENGTH
            ? "var(--success-color)"
            : "var(--text-light-color)";
        document.getElementById("req-lowercase").style.color = /[a-z]/.test(
          value
        )
          ? "var(--success-color)"
          : "var(--text-light-color)";
        document.getElementById("req-uppercase").style.color = /[A-Z]/.test(
          value
        )
          ? "var(--success-color)"
          : "var(--text-light-color)";
        document.getElementById("req-number").style.color = /[0-9]/.test(value)
          ? "var(--success-color)"
          : "var(--text-light-color)";
      }
    };

    passwordInput.addEventListener("focus", () => {
      if (requirementsTooltip) requirementsTooltip.style.display = "block";
      updatePasswordRequirementsUI(); // Оновити при фокусі, якщо вже є текст
    });
    passwordInput.addEventListener("blur", () => {
      if (requirementsTooltip) requirementsTooltip.style.display = "none";
    });
    passwordInput.addEventListener("input", updatePasswordRequirementsUI);

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      messageElement.textContent = "";
      messageElement.className = "form-message";

      const username = registerForm.username.value;
      const email = registerForm.email.value;
      const password = registerForm.password.value;
      const confirmPassword = registerForm.confirmPassword.value;

      const passwordValidationErrors = this.validatePasswordStrength(password);
      if (passwordValidationErrors.length > 0) {
        messageElement.innerHTML =
          'Пароль не відповідає вимогам:<ul style="list-style-type: disc; margin-left: 20px; text-align: left;">' +
          passwordValidationErrors.map((err) => `<li>${err}</li>`).join("") +
          "</ul>";
        messageElement.classList.add("error");
        return;
      }

      if (password !== confirmPassword) {
        messageElement.textContent = "Паролі не співпадають.";
        messageElement.classList.add("error");
        return;
      }

      try {
        const response = await fetch(`${this.apiUrl}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (response.ok) {
          this.saveAuthData(data.token, data.user);
          messageElement.textContent = "Реєстрація успішна! Перенаправлення...";
          messageElement.classList.add("success");
          window.location.href = "index.html";
        } else {
          messageElement.textContent = data.message || "Помилка реєстрації.";
          messageElement.classList.add("error");
        }
      } catch (error) {
        console.error("Register error:", error);
        messageElement.textContent =
          "Сталася помилка сервера. Спробуйте пізніше.";
        messageElement.classList.add("error");
      }
    });
  },

  protectAdminRoutes: function () {
    /* ... (код без змін з попередньої версії) ... */ if (
      window.location.pathname.includes("/admin/")
    ) {
      if (!this.isLoggedIn()) {
        alert("Будь ласка, увійдіть в систему для доступу до адмін-панелі.");
        window.location.href =
          "../login.html?redirect=" +
          encodeURIComponent(window.location.pathname + window.location.search);
        return false;
      }
      const user = this.getUser();
      if (!user || user.role !== "admin") {
        alert("Доступ заборонено. Потрібні права адміністратора.");
        window.location.href = "../index.html";
        return false;
      }
    }
    return true;
  },
};
