// frontend/js/admin/admin-main.js
document.addEventListener("DOMContentLoaded", () => {
  // 1. Захист сторінок адмінки (викликаємо з Auth)
  Auth.protectAdminRoutes(); // Ця функція вже має бути в вашому ../js/auth.js

  // 2. Отримання та відображення інформації про адміна
  const adminUserInfoDiv = document.getElementById("admin-user-info");
  const adminLogoutButtonSidebar = document.getElementById(
    "admin-logout-button"
  ); // Кнопка в сайдбарі

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user && adminUserInfoDiv) {
      adminUserInfoDiv.innerHTML = `
                <span>Вітаємо, <strong>${user.username}</strong>!</span>
                <button id="admin-header-logout-button" class="button button-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Вихід</button>
            `;
      const adminHeaderLogoutButton = document.getElementById(
        "admin-header-logout-button"
      );
      if (adminHeaderLogoutButton) {
        adminHeaderLogoutButton.addEventListener("click", () => Auth.logout());
      }
    }
    if (adminLogoutButtonSidebar) {
      adminLogoutButtonSidebar.addEventListener("click", (e) => {
        e.preventDefault(); // Якщо це посилання <a>
        Auth.logout();
      });
    }
  } else {
    // Якщо з якоїсь причини protectAdminRoutes не спрацював,
    // можна ще раз перенаправити або сховати контент.
    // Зазвичай, protectAdminRoutes вже має перенаправити.
    if (adminUserInfoDiv) adminUserInfoDiv.innerHTML = "";
  }

  // 3. Динамічне оновлення заголовка сторінки в хедері (опціонально)
  // Можна брати з h1 на сторінці або з <title>
  const pageH1 = document.querySelector(
    ".admin-main-content .content-area .content-header h1"
  );

  if (pageH1) {
    headerPageTitle.textContent = pageH1.textContent;
  } else if (headerPageTitle && document.title.includes(" - ")) {
    headerPageTitle.textContent = document.title.split(" - ")[1]; // Беремо частину після "Адмін-панель - "
  }

  // 4. Активне посилання в сайдбарі
  const currentPath = window.location.pathname.split("/").pop(); // Отримати назву файлу, наприклад "dashboard.html"
  const navLinks = document.querySelectorAll(".admin-nav li a");
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active"); // Видалити active з інших
    }
  });
  // Для дашборду, якщо це перше завантаження адмінки
  if (!currentPath || currentPath === "admin" || currentPath === "") {
    // Якщо шлях просто /admin/
    const dashboardLink = document.querySelector(
      '.admin-nav li a[href="dashboard.html"]'
    );
    if (dashboardLink) dashboardLink.classList.add("active");
  }

  console.log("Admin main JS loaded.");
});
