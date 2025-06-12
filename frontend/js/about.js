// frontend/js/about.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_EMPLOYEES = "http://localhost:3000/api/employees";

  const teamGrid = document.getElementById("team-members-grid");
  const teamLoader = document.getElementById("team-loader");
  const teamError = document.getElementById("team-error");
  const teamNoResults = document.getElementById("team-no-results");

  async function fetchAndDisplayTeam() {
    if (!teamGrid) {
      console.error("[about.js] Елемент team-members-grid не знайдено");
      return;
    }

    if (teamLoader) teamLoader.style.display = "block";
    if (teamError) teamError.style.display = "none";
    if (teamNoResults) teamNoResults.style.display = "none";
    teamGrid.innerHTML = "";

    try {
      const response = await fetch(API_URL_EMPLOYEES);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP помилка! Статус: ${response.status}`
        );
      }
      const employees = await response.json();

      if (teamLoader) teamLoader.style.display = "none";

      if (!employees || employees.length === 0) {
        if (teamNoResults) teamNoResults.style.display = "block";
        return;
      }

      employees.forEach((employee) => {
        // Бекенд вже має повертати тільки активних для цього ендпоінту
        const memberCard = document.createElement("div");
        memberCard.className = "team-member-card card";

        const photo = document.createElement("img");
        photo.className = "team-member-photo";
        const photoSrc = employee.PhotoURL
          ? employee.PhotoURL.startsWith("http")
            ? employee.PhotoURL
            : `http://localhost:3000${employee.PhotoURL}`
          : "/frontend/assets/images/default-avatar.png";
        photo.src = photoSrc;
        photo.alt = `${employee.FirstName} ${employee.LastName}`;
        photo.onerror = function () {
          this.src = "/frontend/assets/images/default-avatar.png";
          console.warn(
            `[about.js] Не вдалося завантажити фото для ${employee.FirstName} ${employee.LastName}. Використовується стандартне.`
          );
        };

        const name = document.createElement("h3");
        name.className = "team-member-name";
        name.textContent = `${employee.FirstName} ${employee.LastName}`;

        const position = document.createElement("p");
        position.className = "team-member-position";
        position.textContent = employee.PositionName || "Спеціаліст";

        memberCard.appendChild(photo);
        memberCard.appendChild(name);
        memberCard.appendChild(position);

        teamGrid.appendChild(memberCard);
      });
    } catch (error) {
      console.error("[about.js] Помилка завантаження членів команди:", error);
      if (teamLoader) teamLoader.style.display = "none";
      if (teamError) {
        teamError.textContent = `Помилка завантаження команди: ${error.message}`;
        teamError.style.display = "block";
      }
    }
  }
  if (teamGrid) {
    fetchAndDisplayTeam(); // Викликати тільки якщо елемент існує
  } else {
    console.warn(
      "[about.js] Контейнер для команди (team-members-grid) не знайдено на сторінці."
    );
  }
});
