// frontend/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Frontend JavaScript DOMContentLoaded!");

  // Ініціалізація Auth має йти першою
  if (typeof Auth !== "undefined" && Auth.init) {
    Auth.init();
  } else {
    console.error("Auth object or Auth.init method is not available.");
  }

  // Ініціалізація Кошика
  if (typeof Cart !== "undefined" && Cart.init) {
    Cart.init();
  } else {
    console.error("Cart object or Cart.init method is not available.");
  }

  // Об'єкт Main для глобальних функцій, наприклад, сповіщень
  window.Main = {
    showToast: function (message, type = "info") {
      // type: 'info', 'success', 'error', 'warning'
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
          if (!toastContainer.hasChildNodes()) {
            // toastContainer.remove(); // Можна видаляти, якщо більше немає потреби
          }
        });
      }, 3000);
    },
    // createToastContainer метод більше не потрібен тут, створюємо контейнер при першому виклику showToast
  };
});
