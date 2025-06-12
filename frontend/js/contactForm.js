// frontend/js/contactForm.js
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");
  const formMessage = document.getElementById("contact-form-message");
  const senderPhoneInput = document.getElementById("senderPhone"); // Отримуємо поле телефону
  const API_URL_MESSAGES = "http://localhost:3000/api/contact-messages";

  // Обробник для поля телефону, щоб дозволити тільки цифри (та опціонально "+")
  if (senderPhoneInput) {
    senderPhoneInput.addEventListener("input", function (e) {
      let currentValue = e.target.value;
      let sanitizedValue = "";

      // Дозволяємо опціональний '+' на початку
      if (currentValue.startsWith("+")) {
        sanitizedValue = "+";
        currentValue = currentValue.substring(1); // Беремо решту рядка для перевірки цифр
      }

      // Залишаємо тільки цифри з решти рядка
      sanitizedValue += currentValue.replace(/[^0-9]/g, "");

      e.target.value = sanitizedValue;
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (formMessage) {
        formMessage.textContent = "";
        formMessage.className = "form-message";
      }

      const formData = new FormData(contactForm);
      const data = {
        senderName: formData.get("senderName"),
        senderEmail: formData.get("senderEmail"),
        senderPhone: formData.get("senderPhone") || null, // Телефон вже буде відфільтрований
        messageSubject: formData.get("messageSubject") || null,
        messageText: formData.get("messageText"),
      };

      // Клієнтська валідація
      if (!data.senderName || !data.senderEmail || !data.messageText) {
        if (formMessage) {
          formMessage.textContent =
            "Будь ласка, заповніть обов'язкові поля: Ім'я, Email та Повідомлення.";
          formMessage.classList.add("error");
        }
        return;
      }

      // Додаткова валідація формату телефону (приклад: мінімум 7 цифр після можливого "+")
      if (data.senderPhone) {
        const phoneDigits = data.senderPhone.replace("+", ""); // Рахуємо тільки цифри
        if (
          phoneDigits.length > 0 &&
          (phoneDigits.length < 7 || phoneDigits.length > 15)
        ) {
          // Якщо телефон введено, але він закороткий/задовгий
          if (formMessage) {
            formMessage.textContent =
              'Будь ласка, введіть коректний номер телефону (7-15 цифр, можливий "+" на початку).';
            formMessage.classList.add("error");
          }
          return;
        }
      }

      const submitButton = contactForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Відправка...";
      }

      try {
        const response = await fetch(API_URL_MESSAGES, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          if (formMessage) {
            formMessage.textContent =
              result.message ||
              "Ваше повідомлення успішно відправлено! Ми зв'яжемося з вами найближчим часом.";
            formMessage.classList.remove("error");
            formMessage.classList.add("success");
          }
          contactForm.reset();
        } else {
          if (formMessage) {
            formMessage.textContent =
              result.message || "Сталася помилка при відправці повідомлення.";
            formMessage.classList.remove("success");
            formMessage.classList.add("error");
          }
        }
      } catch (error) {
        console.error("Помилка відправки контактної форми:", error);
        if (formMessage) {
          formMessage.textContent =
            "Не вдалося відправити повідомлення. Перевірте ваше інтернет-з'єднання або спробуйте пізніше.";
          formMessage.classList.remove("success");
          formMessage.classList.add("error");
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Відправити";
        }
      }
    });
  } else {
    console.warn(
      'Контактну форму з ID "contactForm" не знайдено на цій сторінці.'
    );
  }
});
