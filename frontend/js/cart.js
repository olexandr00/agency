// frontend/js/cart.js
const Cart = {
  cartKey: "shoppingCart",
  apiUrl: "http://localhost:3000/api/site-orders",
  checkoutFormInitialized: false,
  isOrderHistoryLoading: false,

  addToCartModalEl: null,
  closeAddToCartModalBtnEl: null,
  continueShoppingBtnEl: null,
  addedItemNameSpanEl: null,

  hasInitialized: false,

  init: function () {
    if (this.hasInitialized) {
      console.log(
        "[Cart.js] init: Already initialized. Skipping subsequent calls but updating count."
      );
      this.updateCartCount();
      return;
    }
    console.log("[Cart.js] init: Initializing for the first time.");
    this.updateCartCount();

    this.addToCartModalEl = document.getElementById("addToCartModal");
    this.closeAddToCartModalBtnEl = document.getElementById(
      "closeAddToCartModalBtn"
    );
    this.continueShoppingBtnEl = document.getElementById("continueShoppingBtn");
    this.addedItemNameSpanEl = document.getElementById("addedItemName");

    if (this.addToCartModalEl) {
      if (this.closeAddToCartModalBtnEl)
        this.closeAddToCartModalBtnEl.addEventListener("click", () =>
          this.hideAddToCartModal()
        );
      if (this.continueShoppingBtnEl)
        this.continueShoppingBtnEl.addEventListener("click", () =>
          this.hideAddToCartModal()
        );
      this.addToCartModalEl.addEventListener("click", (event) => {
        if (event.target === this.addToCartModalEl) this.hideAddToCartModal();
      });
      document.addEventListener("keydown", (event) => {
        if (
          event.key === "Escape" &&
          this.addToCartModalEl &&
          this.addToCartModalEl.classList.contains("active")
        ) {
          this.hideAddToCartModal();
        }
      });
    } else {
      console.warn("[Cart.js] addToCartModal element not found on this page.");
    }

    const cartItemsContainer = document.getElementById("cart-items-container");
    if (cartItemsContainer) {
      console.log(
        "[Cart.js] Cart page detected. Initializing display, checkout, and history."
      );
      this.displayCartItems();
      this.initCheckoutForm();
      this.loadOrderHistory(); // Завантажуємо історію (перевірка авторизації всередині)
    } else {
      console.log("[Cart.js] Not on cart page (no #cart-items-container).");
      // Якщо ми не на сторінці кошика, але є секція історії (наприклад, в профілі користувача),
      // і користувач авторизований, ми все одно можемо спробувати її завантажити.
      // Це потребує, щоб Cart.init() викликався на тій сторінці.
      const historySectionOnly = document.getElementById(
        "order-history-section"
      );
      if (
        historySectionOnly &&
        !document.getElementById("cart-items-container")
      ) {
        // Тільки якщо немає контейнера кошика
        console.log(
          "[Cart.js] Order history section found on non-cart page. Attempting to load history."
        );
        this.loadOrderHistory();
      }
    }
    this.hasInitialized = true;
  },

  showAddToCartModal: function (itemName) {
    if (this.addToCartModalEl && this.addedItemNameSpanEl) {
      this.addedItemNameSpanEl.textContent = itemName || "Послугу";
      this.addToCartModalEl.classList.add("active");
      if (this.continueShoppingBtnEl) this.continueShoppingBtnEl.focus();
    } else {
      console.warn(
        "[Cart.js showAddToCartModal] Modal elements not initialized or found. Using alert fallback."
      );
      alert(`"${itemName || "Послугу"}" додано до кошика!`);
    }
  },
  hideAddToCartModal: function () {
    if (this.addToCartModalEl) this.addToCartModalEl.classList.remove("active");
  },

  addItem: function (service) {
    if (
      !service ||
      typeof service.id === "undefined" ||
      typeof service.name === "undefined" ||
      typeof service.price === "undefined"
    ) {
      console.error("[Cart.js] addItem: Invalid service object", service);
      if (typeof Main !== "undefined" && typeof Main.showToast === "function")
        Main.showToast("Помилка: Некоректні дані послуги.", "error");
      else alert("Помилка: Некоректні дані послуги.");
      return;
    }
    console.log("[Cart.js] addItem for:", service.name);
    const cart = this.getCart();
    const existingItem = cart.find((item) => item.serviceId === service.id);
    if (existingItem) existingItem.quantity += 1;
    else
      cart.push({
        serviceId: service.id,
        name: service.name,
        price: parseFloat(service.price),
        quantity: 1,
      });
    this.saveCart(cart);
    this.showAddToCartModal(service.name);
  },

  getCart: function () {
    const cartData = localStorage.getItem(this.cartKey);
    try {
      return cartData ? JSON.parse(cartData) : [];
    } catch (e) {
      console.error("Error parsing cart from localStorage:", e);
      localStorage.removeItem(this.cartKey);
      return [];
    }
  },

  saveCart: function (cart) {
    console.log("[Cart.js] saveCart. Cart items now:", cart.length);
    try {
      localStorage.setItem(this.cartKey, JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart to localStorage:", e);
      alert("Помилка збереження кошика.");
    }
    this.updateCartCount();
    if (document.getElementById("cart-items-container"))
      this.displayCartItems();
  },

  removeItem: function (serviceId) {
    console.log(`[Cart.js] removeItem called for serviceId: ${serviceId}`);
    let cart = this.getCart();
    cart = cart.filter((item) => String(item.serviceId) !== String(serviceId));
    this.saveCart(cart);
  },

  updateItemQuantity: function (serviceId, quantity) {
    console.log(
      `[Cart.js] updateItemQuantity called for serviceId: ${serviceId}, new quantity: ${quantity}`
    );
    const cart = this.getCart();
    const itemToUpdate = cart.find(
      (item) => String(item.serviceId) === String(serviceId)
    );
    if (itemToUpdate) {
      const newQuantity = parseInt(quantity);
      if (isNaN(newQuantity) || newQuantity <= 0) {
        console.log(
          `[Cart.js] Quantity for serviceId ${serviceId} is invalid or zero, removing item.`
        );
        this.removeItem(serviceId);
      } else {
        itemToUpdate.quantity = newQuantity;
        this.saveCart(cart);
      }
    } else {
      console.warn(
        `[Cart.js] Item with serviceId ${serviceId} not found in cart for quantity update.`
      );
    }
  },

  clearCart: function () {
    console.log("[Cart.js] clearCart called");
    localStorage.removeItem(this.cartKey);
    this.updateCartCount();
    if (document.getElementById("cart-items-container"))
      this.displayCartItems();
  },

  getTotalItems: function () {
    return this.getCart().reduce((total, item) => total + item.quantity, 0);
  },
  getTotalPrice: function () {
    return this.getCart().reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 0),
      0
    );
  }, // Додав || 0 для ціни та кількості

  updateCartCount: function () {
    const cartCountElement = document.getElementById("cart-count");
    if (cartCountElement) cartCountElement.textContent = this.getTotalItems();
  },

  displayCartItems: function () {
    const container = document.getElementById("cart-items-container");
    const summaryEl = document.getElementById("cart-summary");
    const totalPriceEl = document.getElementById("cart-total-price");
    const checkoutFormContainer = document.getElementById(
      "checkout-form-container"
    );

    if (!container || !summaryEl || !totalPriceEl || !checkoutFormContainer) {
      console.warn(
        "[Cart.js displayCartItems] One or more core cart page elements missing."
      );
      return;
    }
    container.innerHTML = ""; // Очищаємо контейнер
    const cart = this.getCart();
    console.log(
      "[Cart.js displayCartItems] Rendering cart items, count:",
      cart.length
    );

    if (cart.length === 0) {
      container.innerHTML =
        '<p id="cart-empty-message" class="info-text" style="text-align:center;">Ваш кошик порожній.</p>';
      summaryEl.style.display = "none";
      checkoutFormContainer.style.display = "none";
      totalPriceEl.textContent = `Загальна сума: 0.00 грн`;
      return;
    }
    summaryEl.style.display = "block";
    checkoutFormContainer.style.display = "block";

    cart.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item card";
      itemDiv.dataset.serviceId = item.serviceId;
      itemDiv.innerHTML = `
        <h3 class="cart-item-name">${item.name || "Послуга"}</h3>
        <p class="cart-item-price">Ціна: ${
          item.price ? parseFloat(item.price).toFixed(2) : "0.00"
        } грн</p>
        <div class="cart-item-quantity">
          <label for="qty-item-${item.serviceId}">Кількість: </label>
          <input type="number" id="qty-item-${item.serviceId}" value="${
        item.quantity || 1
      }" min="0" class="form-input quantity-input" data-service-id="${
        item.serviceId
      }">
          <button class="button button-danger remove-item-button" data-service-id="${
            item.serviceId
          }">Видалити</button>
        </div>
        <p class="cart-item-total">Всього: ${(
          parseFloat(item.price || 0) * (item.quantity || 0)
        ).toFixed(2)} грн</p>
      `;
      container.appendChild(itemDiv);
    });
    totalPriceEl.textContent = `Загальна сума: ${this.getTotalPrice().toFixed(
      2
    )} грн`;
    this.addCartItemEventListeners(container);
  },

  addCartItemEventListeners: function (container) {
    if (!container) return;
    container.querySelectorAll(".quantity-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        this.updateItemQuantity(
          e.target.dataset.serviceId,
          parseInt(e.target.value)
        );
      });
      input.addEventListener("input", (e) => {
        // Для динамічного оновлення суми
        const itemDiv = e.target.closest(".cart-item");
        const cartItem = this.getCart().find(
          (ci) => String(ci.serviceId) === String(e.target.dataset.serviceId)
        );
        if (cartItem && itemDiv) {
          const itemTotalEl = itemDiv.querySelector(".cart-item-total");
          const newQuantity = parseInt(e.target.value) || 0;
          if (itemTotalEl && cartItem.price)
            itemTotalEl.textContent = `Всього: ${(
              parseFloat(cartItem.price) * newQuantity
            ).toFixed(2)} грн`;
          this.updateLiveTotalPrice();
        }
      });
    });
    container.querySelectorAll(".remove-item-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        this.removeItem(e.target.dataset.serviceId);
      });
    });
  },

  updateLiveTotalPrice: function () {
    const totalPriceEl = document.getElementById("cart-total-price");
    if (!totalPriceEl) return;
    let liveTotal = 0;
    const quantityInputs = document.querySelectorAll(
      "#cart-items-container .quantity-input"
    );
    const currentCart = this.getCart();
    quantityInputs.forEach((input) => {
      const serviceId = input.dataset.serviceId;
      const quantity = parseInt(input.value) || 0;
      const cartItem = currentCart.find(
        (item) => String(item.serviceId) === String(serviceId)
      );
      if (cartItem && cartItem.price) {
        liveTotal += parseFloat(cartItem.price) * quantity;
      }
    });
    totalPriceEl.textContent = `Загальна сума: ${liveTotal.toFixed(2)} грн`;
  },

  initCheckoutForm: function () {
    if (this.checkoutFormInitialized) {
      console.log(
        "[Cart.js initCheckoutForm] Form already initialized. Skipping."
      );
      return;
    }
    console.log("[Cart.js initCheckoutForm] Initializing checkout form...");

    const form = document.getElementById("checkout-form");
    const messageEl = document.getElementById("checkout-message");
    const customerPhoneInput = document.getElementById("customerPhone"); // Поле телефону для форми
    const userInfoEl = document.getElementById("user-info-for-checkout"); // Елементи для даних авторизованого користувача
    const usernameEl = document.getElementById("checkout-username");
    const userEmailEl = document.getElementById("checkout-email");
    const customerNameInput = document.getElementById("customerName");
    const customerEmailInput = document.getElementById("customerEmail");
    const authRequiredMessage = document.querySelector(
      "#checkout-form .auth-required-message"
    );
    const submitButton = document.getElementById("submit-checkout-button");

    if (!form || !submitButton || !messageEl) {
      console.warn(
        "[Cart.js initCheckoutForm] Core elements for checkout form (form, submitButton, messageEl) are missing."
      );
      return; // Не продовжуємо, якщо основних елементів немає
    }

    // Обробник для поля телефону, щоб дозволити тільки цифри (та опціонально "+")
    if (customerPhoneInput) {
      customerPhoneInput.addEventListener("input", function (e) {
        let currentValue = e.target.value;
        let sanitizedValue = "";
        if (currentValue.startsWith("+")) {
          sanitizedValue = "+";
          currentValue = currentValue.substring(1);
        }
        sanitizedValue += currentValue.replace(/[^0-9]/g, "");
        e.target.value = sanitizedValue;
      });
      console.log("[Cart.js initCheckoutForm] Phone input sanitizer attached.");
    } else {
      console.warn("[Cart.js initCheckoutForm] customerPhoneInput not found.");
    }

    const isLoggedIn =
      typeof Auth !== "undefined" &&
      typeof Auth.isLoggedIn === "function" &&
      Auth.isLoggedIn();

    if (isLoggedIn) {
      const user = Auth.getUser(); // Припускаємо, що Auth.getUser() повертає об'єкт або null
      if (userInfoEl) userInfoEl.style.display = "block";
      if (usernameEl && user) usernameEl.textContent = user.username || "";
      if (userEmailEl && user) userEmailEl.textContent = user.email || "";
      if (customerNameInput && user && !customerNameInput.value)
        customerNameInput.value = user.username || "";
      if (customerEmailInput && user && !customerEmailInput.value)
        customerEmailInput.value = user.email || "";
      // Поле телефону НЕ заповнюємо автоматично
      if (authRequiredMessage) authRequiredMessage.style.display = "none";
      submitButton.disabled = false;
      submitButton.textContent = "Оформити замовлення";
    } else {
      if (userInfoEl) userInfoEl.style.display = "none";
      if (authRequiredMessage) authRequiredMessage.style.display = "block";
      submitButton.disabled = true;
      submitButton.textContent = "Увійдіть для оформлення";
      messageEl.textContent = ""; // Очищаємо повідомлення
      messageEl.className = "form-message";
      // Не встановлюємо checkoutFormInitialized = true, бо форма неактивна
      console.log(
        "[Cart.js initCheckoutForm] User not logged in. Checkout disabled."
      );
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("[Cart.js initCheckoutForm] Checkout form submitted.");
      if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
      }

      const formData = new FormData(form);
      const customerPhoneValue = customerPhoneInput
        ? customerPhoneInput.value
        : formData.get("customerPhone"); // Беремо значення з поля, якщо воно є

      // Клієнтська валідація
      const customerName = formData.get("customerName");
      const customerEmail = formData.get("customerEmail");

      if (!customerName || !customerEmail) {
        if (messageEl) {
          messageEl.textContent =
            "Будь ласка, заповніть обов'язкові поля: Ім'я та Email.";
          messageEl.classList.add("error");
        }
        return;
      }
      // Додаткова валідація телефону
      if (customerPhoneValue) {
        const phoneDigits = customerPhoneValue.replace("+", "");
        if (
          phoneDigits.length > 0 &&
          (phoneDigits.length < 7 || phoneDigits.length > 15)
        ) {
          if (messageEl) {
            messageEl.textContent =
              'Будь ласка, введіть коректний номер телефону (7-15 цифр, можливий "+" на початку).';
            messageEl.classList.add("error");
          }
          return;
        }
      } else {
        // Якщо телефон обов'язковий
        // if (messageEl) {
        //     messageEl.textContent = 'Будь ласка, введіть ваш номер телефону.';
        //     messageEl.classList.add('error');
        // }
        // return;
      }

      const orderPayload = {
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhoneValue || null, // Надсилаємо null, якщо поле порожнє
        customerNotes: formData.get("customerNotes"),
        items: this.getCart().map((item) => ({
          serviceId: item.serviceId,
          quantity: item.quantity,
        })),
      };

      console.log(
        "[Cart.js initCheckoutForm] Order Payload to be sent:",
        JSON.stringify(orderPayload, null, 2)
      );

      if (orderPayload.items.length === 0) {
        if (messageEl) {
          messageEl.textContent = "Ваш кошик порожній.";
          messageEl.classList.add("warning");
        }
        return;
      }
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Обробка...";
      }

      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Auth.getToken()}`,
          },
          body: JSON.stringify(orderPayload),
        });
        console.log(
          "[Cart.js initCheckoutForm] Server response status:",
          response.status
        );
        const result = await response.json();
        console.log(
          "[Cart.js initCheckoutForm] Server response data:",
          JSON.stringify(result, null, 2)
        );

        if (response.ok) {
          let successMsg = `Замовлення успішно оформлено! ${
            result.message || ""
          }`;
          if (result.order && result.order.publicOrderId) {
            successMsg = `Замовлення №${
              result.order.publicOrderId
            } успішно оформлено! ${result.message || ""}`;
          } else {
            console.warn(
              "[Cart.js initCheckoutForm] publicOrderId missing in successful response:",
              result.order
            );
          }
          if (messageEl) {
            messageEl.textContent = successMsg;
            messageEl.classList.add("success");
          }
          this.clearCart();
          form.reset();
          if (isLoggedIn) {
            const user = Auth.getUser();
            if (customerNameInput && user)
              customerNameInput.value = user.username || "";
            if (customerEmailInput && user)
              customerEmailInput.value = user.email || "";
            if (customerPhoneInput) customerPhoneInput.value = ""; // Очищаємо телефон
          }
          // Невелика затримка перед оновленням історії, щоб дати серверу час
          setTimeout(() => {
            if (typeof this.loadOrderHistory === "function")
              this.loadOrderHistory();
          }, 500);
        } else {
          if (messageEl) {
            messageEl.textContent = `Помилка оформлення замовлення: ${
              result.message || "Невідома помилка сервера"
            }`;
            messageEl.classList.add("error");
          }
        }
      } catch (err) {
        console.error("Error submitting order:", err);
        if (messageEl) {
          messageEl.textContent =
            "Помилка відправки замовлення. Перевірте з'єднання та спробуйте пізніше.";
          messageEl.classList.add("error");
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Оформити замовлення";
        }
      }
    });
    this.checkoutFormInitialized = true;
    console.log(
      "[Cart.js initCheckoutForm] Checkout form event listener and phone input handler attached."
    );
  },

  loadOrderHistory: async function () {
    if (this.isOrderHistoryLoading) {
      console.warn(
        "[Cart.js loadOrderHistory] Already loading history. Skipping."
      );
      return;
    }
    console.log(
      "[Cart.js loadOrderHistory] Attempting to load order history..."
    );
    this.isOrderHistoryLoading = true;

    const historySection = document.getElementById("order-history-section");
    const historyListEl = document.getElementById("order-history-list");
    const loaderEl = document.getElementById("order-history-loader");
    const errorEl = document.getElementById("order-history-error");
    const noResultsEl = document.getElementById("order-history-no-results");
    const authRequiredHistoryMsg = document.querySelector(
      "#order-history-section .auth-required-message-history"
    );

    if (!historySection || !historyListEl) {
      console.warn(
        "[Cart.js loadOrderHistory] Order history display elements (#order-history-section or #order-history-list) not found. History will not be loaded."
      );
      this.isOrderHistoryLoading = false;
      return;
    }

    // Очищаємо список ПЕРЕД будь-якими запитами
    historyListEl.innerHTML = "";
    if (loaderEl) loaderEl.style.display = "block";
    if (errorEl) errorEl.style.display = "none";
    if (noResultsEl) noResultsEl.style.display = "none";
    if (authRequiredHistoryMsg) authRequiredHistoryMsg.style.display = "none";
    historySection.style.display = "block";

    const isLoggedIn =
      typeof Auth !== "undefined" &&
      typeof Auth.isLoggedIn === "function" &&
      Auth.isLoggedIn();
    if (!isLoggedIn) {
      console.log(
        "[Cart.js loadOrderHistory] User not logged in. Displaying auth required message."
      );
      if (authRequiredHistoryMsg)
        authRequiredHistoryMsg.style.display = "block";
      if (loaderEl) loaderEl.style.display = "none"; // Сховати лоадер, якщо він був показаний
      this.isOrderHistoryLoading = false;
      return;
    }

    try {
      const token = Auth.getToken();
      const responseList = await fetch(this.apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!responseList.ok) {
        const errorData = await responseList.json().catch(() => ({
          message: `HTTP error! status: ${responseList.status}`,
        }));
        throw new Error(errorData.message);
      }
      const ordersSummary = await responseList.json();
      console.log(
        "[Cart.js loadOrderHistory] Orders summary received, count:",
        ordersSummary.length
      );

      if (ordersSummary.length === 0) {
        if (noResultsEl) {
          noResultsEl.textContent = "Ваша історія замовлень порожня.";
          noResultsEl.style.display = "block";
        } else {
          historyListEl.innerHTML =
            '<p class="info-text" style="text-align:center;">Ваша історія замовлень порожня.</p>';
        }
      } else {
        const orderDetailPromises = ordersSummary.map((orderSum) => {
          const orderIdentifier = orderSum.PublicOrderID || orderSum.OrderID;
          return fetch(`${this.apiUrl}/${orderIdentifier}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => {
              if (!res.ok) {
                console.error(
                  `[Cart.js loadOrderHistory] Details fetch FAIL for ${orderIdentifier}, status: ${res.status}`
                );
                return {
                  ...orderSum,
                  _error: true,
                  _errorMessage: `Помилка завантаження деталей (статус ${res.status})`,
                };
              }
              return res.json();
            })
            .catch((err) => {
              console.error(
                `[Cart.js loadOrderHistory] Network ERROR fetching details for ${orderIdentifier}:`,
                err
              );
              return {
                ...orderSum,
                _error: true,
                _errorMessage: `Мережева помилка: ${err.message}`,
              };
            });
        });

        const ordersWithDetails = await Promise.all(orderDetailPromises);
        console.log(
          "[Cart.js loadOrderHistory] All details fetched/failed. Count:",
          ordersWithDetails.length
        );

        historyListEl.innerHTML = ""; // Ще раз очищаємо перед рендерингом остаточних карток

        ordersWithDetails.forEach((orderDetails) => {
          const orderCard = document.createElement("div");
          orderCard.className = "card order-history-item";
          orderCard.style.marginBottom = "1rem";

          const orderHeader = document.createElement("h4");
          const displayOrderId =
            orderDetails.PublicOrderID ||
            `Вн.ID:${orderDetails.OrderID}` ||
            "N/A";
          orderHeader.innerHTML = `Замовлення №${displayOrderId} <span style="font-size:0.9em; color: var(--text-light-color);">- ${
            orderDetails.OrderDate
              ? new Date(orderDetails.OrderDate).toLocaleDateString("uk-UA")
              : ""
          }</span>`;
          orderHeader.style.marginBottom = "0.5rem";

          const orderStatusP = document.createElement("p");
          orderStatusP.innerHTML = `Статус: <strong style="color: ${this.getOrderStatusColor(
            orderDetails.OrderStatus
          )}">${this.translateOrderStatus(orderDetails.OrderStatus)}</strong>`;

          const orderTotalP = document.createElement("p");
          orderTotalP.textContent = `Сума: ${
            orderDetails.TotalAmount
              ? parseFloat(orderDetails.TotalAmount).toFixed(2)
              : "0.00"
          } грн`;
          orderTotalP.style.fontWeight = "bold";

          orderCard.appendChild(orderHeader);
          orderCard.appendChild(orderStatusP);
          orderCard.appendChild(orderTotalP);

          if (orderDetails._error) {
            const errorDetailsP = document.createElement("p");
            errorDetailsP.className = "error-text";
            errorDetailsP.style.fontSize = "0.9em";
            errorDetailsP.textContent =
              orderDetails._errorMessage ||
              "Не вдалося завантажити деталі послуг.";
            orderCard.appendChild(errorDetailsP);
          } else if (
            orderDetails.services &&
            orderDetails.services.length > 0
          ) {
            const servicesTitle = document.createElement("p");
            servicesTitle.innerHTML = "<strong>Замовлені послуги:</strong>";
            servicesTitle.style.marginTop = "0.5rem";
            orderCard.appendChild(servicesTitle);

            const servicesUl = document.createElement("ul");
            servicesUl.style.listStylePosition = "inside";
            servicesUl.style.paddingLeft = "10px";
            orderDetails.services.forEach((serviceItem) => {
              const serviceLi = document.createElement("li");
              serviceLi.style.fontSize = "0.9em";
              serviceLi.textContent = `${
                serviceItem.ServiceName || "Послуга"
              } - ${serviceItem.Quantity || 0} шт. x ${
                serviceItem.PriceAtOrder
                  ? parseFloat(serviceItem.PriceAtOrder).toFixed(2)
                  : "N/A"
              } грн`;
              servicesUl.appendChild(serviceLi);
            });
            orderCard.appendChild(servicesUl);
          } else {
            const noServicesP = document.createElement("p");
            noServicesP.style.fontSize = "0.9em";
            noServicesP.textContent =
              "Для цього замовлення не знайдено деталей послуг.";
            orderCard.appendChild(noServicesP);
          }
          historyListEl.appendChild(orderCard);
        });
      }
    } catch (e) {
      console.error("Error in loadOrderHistory main try block:", e);
      if (errorEl) {
        errorEl.textContent = `Помилка завантаження історії: ${e.message}`;
        errorEl.style.display = "block";
      }
    } finally {
      this.isOrderHistoryLoading = false;
      if (loaderEl) loaderEl.style.display = "none";
      console.log("[Cart.js loadOrderHistory] Finished.");
    }
  },

  translateOrderStatus: function (status) {
    const statuses = {
      new: "Нове",
      processing: "В обробці",
      completed: "Завершено",
      cancelled: "Скасовано",
    };
    return statuses[status] || status;
  },
  getOrderStatusColor: function (status) {
    switch (status) {
      case "new":
        return "var(--primary-color)";
      case "processing":
        return "var(--warning-color)";
      case "completed":
        return "var(--success-color)";
      case "cancelled":
        return "var(--danger-color)";
      default:
        return "var(--text-light-color)";
    }
  },
};

if (typeof Cart !== "undefined" && typeof Cart.init === "function") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[Cart.js] DOMContentLoaded, initializing Cart object.");
    // Перевіряємо, чи ми на сторінці, де потрібна повна ініціалізація кошика
    if (
      document.body.id === "cart-page-body" || // Якщо у <body id="cart-page-body"> на сторінці кошика
      document.getElementById("cart-items-container") || // Або є контейнер товарів кошика
      document.querySelector(".add-to-cart-button")
    ) {
      // Або є кнопки додавання в кошик
      Cart.init();
    } else {
      // Для інших сторінок, де потрібен тільки лічильник
      Cart.updateCartCount(); // Просто оновлюємо лічильник
      console.log(
        "[Cart.js] Not a primary cart interaction page. Only updated cart count."
      );
    }
  });
} else {
  console.error("[Cart.js] Cart object or Cart.init method is not defined.");
}
