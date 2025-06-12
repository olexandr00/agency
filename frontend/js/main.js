// frontend/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  // Ініціалізація Auth
  if (typeof Auth !== "undefined" && Auth.init) {
    Auth.init();
  } else {
    console.error("Об'єкт Auth або метод Auth.init недоступний.");
  }

  // Ініціалізація Кошика
  if (typeof Cart !== "undefined" && Cart.init) {
    Cart.init();
  } else {
    console.error("Об'єкт Cart або метод Cart.init недоступний.");
  }

  // Об'єкт Main для глобальних функцій, наприклад сповіщень
  window.Main = {
    showToast: function (message, type = "info") {
      let toastContainer = document.getElementById("toast-container");
      if (!toastContainer) {
        // Створюємо контейнер, якщо його немає
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;

      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.add("toast-fade-out");
        toast.addEventListener("animationend", () => {
          // Видаляємо після завершення анімації
          toast.remove();
        });
      }, 3000);
    },
  };
});
