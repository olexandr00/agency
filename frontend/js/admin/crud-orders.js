// frontend/js/admin/crud-orders.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_ORDERS = "http://localhost:3000/api/site-orders";
  const token = Auth.getToken();

  const ordersTableBody = document.getElementById("ordersTableBody");
  const ordersLoader = document.getElementById("orders-loader");
  const ordersError = document.getElementById("orders-error");
  const ordersNoResults = document.getElementById("orders-no-results");

  const orderSearchInput = document.getElementById("orderSearchInput"); // Плейсхолдер можна змінити в HTML
  const orderStatusFilter = document.getElementById("orderStatusFilter");
  const userIdFilterInput = document.getElementById("userIdFilterInput");

  const orderModal = document.getElementById("orderModal");
  const closeModalButton = orderModal
    ? orderModal.querySelector(".close-modal-button")
    : null;
  const modalTitleOrderId = orderModal
    ? orderModal.querySelector("#modalOrderId")
    : null;
  const modalOrderUser = document.getElementById("modalOrderUser");
  const modalOrderCustomerName = document.getElementById(
    "modalOrderCustomerName"
  );
  const modalOrderCustomerEmail = document.getElementById(
    "modalOrderCustomerEmail"
  );
  const modalOrderCustomerPhone = document.getElementById(
    "modalOrderCustomerPhone"
  );
  const modalOrderDate = document.getElementById("modalOrderDate");
  const modalOrderTotalAmount = document.getElementById(
    "modalOrderTotalAmount"
  );
  const modalOrderCustomerNotes = document.getElementById(
    "modalOrderCustomerNotes"
  );
  const modalOrderedServicesBody = document.getElementById(
    "modalOrderedServicesBody"
  );
  const orderStatusForm = document.getElementById("orderStatusForm");
  const modalOrderStatusSelect = document.getElementById("modalOrderStatus");
  const orderIdHiddenInput = document.getElementById("orderIdHidden");
  const orderFormMessage = document.getElementById("order-form-message");

  let searchTimeout;

  async function fetchAndDisplayOrders() {
    showLoader();
    const searchTerm = orderSearchInput ? orderSearchInput.value.trim() : "";
    const status = orderStatusFilter ? orderStatusFilter.value : "";
    const userId = userIdFilterInput ? userIdFilterInput.value.trim() : "";

    try {
      let url = new URL(API_URL_ORDERS);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (status) url.searchParams.append("status", status);
      if (userId && !isNaN(parseInt(userId))) {
        // Надсилаємо userId тільки якщо це число
        url.searchParams.append("userId", parseInt(userId));
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP Error: ${response.status}` }));
        throw new Error(
          errorData.message || `Помилка завантаження: ${response.status}`
        );
      }
      const ordersData = await response.json();
      renderOrdersTable(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showError(error.message);
    }
  }

  function renderOrdersTable(orders) {
    hideMessages();
    if (!ordersTableBody) {
      console.error("ordersTableBody not found");
      return;
    }
    ordersTableBody.innerHTML = "";

    if (!orders || orders.length === 0) {
      showNoResults();
      return;
    }

    orders.forEach((order) => {
      const row = ordersTableBody.insertRow();
      const publicOrderIdCell = row.insertCell();
      publicOrderIdCell.textContent = order.PublicOrderID || "N/A";

      row.insertCell().textContent = order.CustomerName || "N/A";
      row.insertCell().textContent = order.CustomerEmail || "N/A";
      row.insertCell().textContent = order.CustomerPhone || "N/A";
      row.insertCell().textContent = order.OrderDate
        ? new Date(order.OrderDate).toLocaleString("uk-UA")
        : "N/A";

      const totalAmountCell = row.insertCell();
      totalAmountCell.textContent = order.TotalAmount
        ? parseFloat(order.TotalAmount).toFixed(2)
        : "0.00";
      totalAmountCell.style.textAlign = "right";

      const statusCell = row.insertCell();
      statusCell.textContent = translateOrderStatus(order.OrderStatus);
      statusCell.style.fontWeight = "bold";
      statusCell.style.color = getOrderStatusColor(order.OrderStatus);

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";
      const detailsButton = document.createElement("button");
      detailsButton.className = "button button-small button-edit";
      detailsButton.textContent = "Деталі";
      detailsButton.addEventListener("click", () =>
        openOrderModal(order.PublicOrderID || order.OrderID)
      ); // Передаємо PublicOrderID або OrderID
      actionsCell.appendChild(detailsButton);
    });
  }

  function translateOrderStatus(status) {
    const statuses = {
      new: "Нове",
      processing: "В обробці",
      completed: "Завершено",
      cancelled: "Скасовано",
    };
    return statuses[status] || status;
  }
  function getOrderStatusColor(status) {
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
  }

  function showLoader() {
    if (ordersLoader) ordersLoader.style.display = "block";
    if (ordersError) ordersError.style.display = "none";
    if (ordersNoResults) ordersNoResults.style.display = "none";
  }
  function showError(message) {
    if (ordersLoader) ordersLoader.style.display = "none";
    if (ordersError) {
      ordersError.textContent = `Помилка: ${message}`;
      ordersError.style.display = "block";
    }
    if (ordersNoResults) ordersNoResults.style.display = "none";
  }
  function showNoResults() {
    if (ordersLoader) ordersLoader.style.display = "none";
    if (ordersError) ordersError.style.display = "none";
    if (ordersNoResults) ordersNoResults.style.display = "block";
  }
  function hideMessages() {
    if (ordersLoader) ordersLoader.style.display = "none";
    if (ordersError) ordersError.style.display = "none";
    if (ordersNoResults) ordersNoResults.style.display = "none";
  }

  async function openOrderModal(identifier) {
    if (orderFormMessage) {
      orderFormMessage.textContent = "";
      orderFormMessage.className = "form-message";
    }
    try {
      const response = await fetch(`${API_URL_ORDERS}/${identifier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Не вдалося завантажити деталі замовлення");
      const order = await response.json();

      if (modalTitleOrderId)
        modalTitleOrderId.textContent = order.PublicOrderID || "N/A";
      if (orderIdHiddenInput) orderIdHiddenInput.value = order.OrderID;

      if (modalOrderUser)
        modalOrderUser.textContent = `${order.UserUsername || "N/A"}`;
      if (modalOrderCustomerName)
        modalOrderCustomerName.textContent = order.CustomerName || "N/A";
      if (modalOrderCustomerEmail)
        modalOrderCustomerEmail.textContent = order.CustomerEmail || "N/A";
      if (modalOrderCustomerPhone)
        modalOrderCustomerPhone.textContent = order.CustomerPhone || "N/A";
      if (modalOrderDate)
        modalOrderDate.textContent = order.OrderDate
          ? new Date(order.OrderDate).toLocaleString("uk-UA", {
              dateStyle: "long",
              timeStyle: "short",
            })
          : "N/A";
      if (modalOrderTotalAmount)
        modalOrderTotalAmount.textContent = order.TotalAmount
          ? parseFloat(order.TotalAmount).toFixed(2)
          : "0.00";
      if (modalOrderCustomerNotes)
        modalOrderCustomerNotes.textContent = order.CustomerNotes || "Немає";
      if (modalOrderStatusSelect)
        modalOrderStatusSelect.value = order.OrderStatus || "new";

      if (modalOrderedServicesBody) {
        modalOrderedServicesBody.innerHTML = "";
        if (order.services && order.services.length > 0) {
          order.services.forEach((item) => {
            const row = modalOrderedServicesBody.insertRow();
            row.insertCell().textContent = item.ServiceName || "N/A";
            row.insertCell().textContent = item.Quantity || 0;
            row.insertCell().textContent = item.PriceAtOrder
              ? parseFloat(item.PriceAtOrder).toFixed(2)
              : "0.00";
            row.insertCell().textContent =
              item.Quantity && item.PriceAtOrder
                ? (item.Quantity * item.PriceAtOrder).toFixed(2)
                : "0.00";
          });
        } else {
          modalOrderedServicesBody.innerHTML =
            '<tr><td colspan="4" style="text-align:center;">Немає замовлених послуг.</td></tr>';
        }
      }
      if (orderModal) orderModal.classList.add("active");
    } catch (error) {
      console.error("Error opening order modal:", error);
      alert(error.message || "Помилка завантаження деталей замовлення.");
    }
  }

  if (closeModalButton)
    closeModalButton.addEventListener("click", () => {
      if (orderModal) orderModal.classList.remove("active");
    });
  window.addEventListener("click", (event) => {
    if (event.target === orderModal && orderModal)
      orderModal.classList.remove("active");
  });

  if (orderStatusForm) {
    orderStatusForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (orderFormMessage) {
        orderFormMessage.textContent = "";
        orderFormMessage.className = "form-message";
      }

      const orderIdToUpdate = orderIdHiddenInput
        ? orderIdHiddenInput.value
        : null;
      const newStatus = modalOrderStatusSelect
        ? modalOrderStatusSelect.value
        : null;

      if (!orderIdToUpdate || !newStatus) {
        if (orderFormMessage) {
          orderFormMessage.textContent =
            "Помилка: ID замовлення або новий статус не вказано.";
          orderFormMessage.classList.add("error");
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_URL_ORDERS}/${orderIdToUpdate}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          }
        );
        const result = await response.json();
        if (response.ok) {
          if (orderFormMessage) {
            orderFormMessage.textContent =
              result.message || "Статус замовлення успішно оновлено!";
            orderFormMessage.classList.add("success");
          }
          fetchAndDisplayOrders();
          setTimeout(() => {
            if (orderModal) orderModal.classList.remove("active");
          }, 1500);
        } else {
          if (orderFormMessage) {
            orderFormMessage.textContent =
              result.message || "Помилка оновлення статусу.";
            orderFormMessage.classList.add("error");
          }
        }
      } catch (error) {
        console.error("Error updating order status:", error);
        if (orderFormMessage) {
          orderFormMessage.textContent = "Сталася помилка сервера.";
          orderFormMessage.classList.add("error");
        }
      }
    });
  }

  function debouncedFetch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayOrders();
    }, 500); // Затримка 500 мс
  }

  if (orderSearchInput)
    orderSearchInput.addEventListener("input", debouncedFetch);
  if (orderStatusFilter)
    orderStatusFilter.addEventListener("change", fetchAndDisplayOrders);
  if (userIdFilterInput)
    userIdFilterInput.addEventListener("input", debouncedFetch);

  if (token) {
    if (typeof fetchAndDisplayOrders === "function") fetchAndDisplayOrders();
  } else {
    showError("Необхідна авторизація для перегляду замовлень.");
    const mainContent = document.querySelector(".content-area");
    if (mainContent) mainContent.style.display = "none";
  }
});
