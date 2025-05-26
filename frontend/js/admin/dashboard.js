// frontend/js/admin/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_BASE = "http://localhost:3000/api"; // Базовий URL для API

  async function fetchDataForWidget(
    url,
    elementId,
    dataKey,
    singularText,
    pluralTextFew,
    pluralTextMany
  ) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const token = Auth.getToken(); // Потрібен токен для запитів до API
      if (!token) {
        element.textContent = "Не авторизовано";
        return;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error(`Error fetching ${url}: ${response.status}`);
        element.textContent = "Помилка";
        return;
      }
      const data = await response.json();
      let value;
      if (dataKey.includes(".")) {
        // Для вкладених ключів, наприклад 'stats.new'
        value = dataKey.split(".").reduce((o, k) => (o || {})[k], data);
      } else {
        value = data[dataKey];
      }

      if (typeof value === "number") {
        element.textContent = value;
        // Опціонально: можна додати текст після числа
        // const count = value;
        // let text = pluralTextMany;
        // if (count === 1) text = singularText;
        // else if (count >= 2 && count <= 4) text = pluralTextFew;
        // element.textContent = `${count} ${text}`;
      } else if (Array.isArray(value)) {
        // Якщо API повертає масив, беремо його довжину
        element.textContent = value.length;
      } else {
        element.textContent = value || "0"; // Або дані, або 0
      }
    } catch (error) {
      console.error(`Error fetching data for ${elementId}:`, error);
      element.textContent = "Н/Д";
    }
  }

  // Завантаження даних для віджетів
  // Потрібно, щоб API ендпоінти існували та повертали відповідні дані
  // Наприклад, для нових замовлень: GET /api/site-orders?status=new (повертає масив)
  // Для непрочитаних повідомлень: GET /api/contact-messages/unread-count (повертає {unreadCount: X})
  // Для відгуків на модерації: GET /api/reviews?approved=false (повертає масив)
  // Для користувачів: GET /api/users (повертає масив)

  fetchDataForWidget(
    `${API_URL_BASE}/site-orders?status=new`,
    "new-orders-count",
    "length"
  ); // Припускаємо, що API повертає масив
  fetchDataForWidget(
    `${API_URL_BASE}/contact-messages/unread-count`,
    "unread-messages-count",
    "unreadCount"
  );
  fetchDataForWidget(
    `${API_URL_BASE}/reviews?approved=0`,
    "pending-reviews-count",
    "length"
  ); // approved=0 або approved=false
  fetchDataForWidget(`${API_URL_BASE}/users`, "total-users-count", "length");
});
