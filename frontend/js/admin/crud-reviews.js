// frontend/js/admin/crud-reviews.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_REVIEWS = "http://localhost:3000/api/reviews";
  const API_URL_SERVICES = "http://localhost:3000/api/services";
  const token = Auth.getToken();

  const reviewsTableBody = document.getElementById("reviewsTableBody");
  const reviewsLoader = document.getElementById("reviews-loader");
  const reviewsError = document.getElementById("reviews-error");
  const reviewsNoResults = document.getElementById("reviews-no-results");

  const reviewSearchInput = document.getElementById("reviewSearchInput");
  const approvalStatusFilter = document.getElementById("approvalStatusFilter");
  const serviceFilterSelect = document.getElementById("serviceFilter");

  const reviewModal = document.getElementById("reviewModal");
  const closeModalButton = reviewModal.querySelector(".close-modal-button");
  const modalTitle = reviewModal.querySelector("#modalTitle");
  const modalReviewAuthor = document.getElementById("modalReviewAuthor");
  const modalReviewService = document.getElementById("modalReviewService");
  const modalReviewDate = document.getElementById("modalReviewDate");
  const modalReviewRatingDisplay = document.getElementById("modalReviewRating");
  const modalReviewText = document.getElementById("modalReviewText");
  const modalReviewStatusSelect = document.getElementById("modalReviewStatus");
  const saveReviewChangesBtn = document.getElementById("saveReviewChangesBtn");
  const reviewFormMessage = document.getElementById("review-form-message");

  let allServices = [];
  let currentEditingReviewId = null;

  async function loadServicesForFilter() {
    try {
      const response = await fetch(API_URL_SERVICES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Не вдалося завантажити послуги для фільтра");
      allServices = await response.json();
      if (serviceFilterSelect) {
        serviceFilterSelect.innerHTML = '<option value="">Всі послуги</option>';
        allServices.forEach((service) => {
          serviceFilterSelect.add(
            new Option(service.ServiceName, service.ServiceID)
          );
        });
      }
    } catch (error) {
      console.error("Error loading services for filter:", error);
      if (serviceFilterSelect)
        serviceFilterSelect.innerHTML =
          '<option value="">Помилка завантаження</option>';
    }
  }

  async function fetchAndDisplayReviews() {
    showLoader();
    const searchTerm = reviewSearchInput ? reviewSearchInput.value.trim() : "";
    const approvedValue = approvalStatusFilter
      ? approvalStatusFilter.value
      : "";
    const serviceId = serviceFilterSelect ? serviceFilterSelect.value : "";

    try {
      let url = new URL(API_URL_REVIEWS);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (approvedValue !== "")
        url.searchParams.append("approved", approvedValue);
      if (serviceId) url.searchParams.append("serviceId", serviceId);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => `Failed to read error text, status: ${response.status}`);
        throw new Error(
          `HTTP error! Status: ${response.status} - ${errorText}`
        );
      }
      const reviewsData = await response.json();

      renderReviewsTable(reviewsData);
    } catch (error) {
      console.error(
        "[crud-reviews fetchAndDisplayReviews] Error fetching reviews:",
        error
      );
      showError(error.message);
    }
  }

  function renderReviewsTable(reviews) {
    hideMessages();
    if (!reviewsTableBody) {
      console.error("reviewsTableBody element not found!");
      return;
    }
    reviewsTableBody.innerHTML = "";

    if (!reviews || reviews.length === 0) {
      showNoResults();
      return;
    }

    reviews.forEach((review) => {
      const row = reviewsTableBody.insertRow();

      row.insertCell().textContent = review.UserName || "Анонім";

      row.insertCell().textContent = review.ServiceName || "Загальний";

      const textCell = row.insertCell();
      const reviewTextContent = review.ReviewText || "";
      textCell.textContent =
        reviewTextContent.length > 50
          ? reviewTextContent.substring(0, 50) + "..."
          : reviewTextContent;
      textCell.title = reviewTextContent;
      textCell.classList.add("review-text-cell");

      const ratingCell = row.insertCell();
      const ratingValue = review.Rating;

      if (
        ratingValue !== null &&
        ratingValue !== undefined &&
        String(ratingValue).trim() !== ""
      ) {
        const numericRating = parseInt(ratingValue, 10);
        if (!isNaN(numericRating) && numericRating >= 1 && numericRating <= 5) {
          ratingCell.textContent = numericRating;
        } else {
          ratingCell.textContent = "N/A";
        }
      } else {
        ratingCell.textContent = "N/A";
      }
      ratingCell.style.textAlign = "center";

      row.insertCell().textContent = review.ReviewDate
        ? new Date(review.ReviewDate).toLocaleString("uk-UA")
        : "N/A";

      const statusCell = row.insertCell();
      statusCell.textContent = review.IsApproved ? "Схвалено" : "На модерації";
      statusCell.className = review.IsApproved
        ? "status-approved"
        : "status-pending";

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";
      const toggleApprovalButton = document.createElement("button");
      toggleApprovalButton.className = `button button-small ${
        review.IsApproved ? "button-warning" : "button-success"
      }`;
      toggleApprovalButton.textContent = review.IsApproved
        ? "Відхилити"
        : "Схвалити";
      toggleApprovalButton.addEventListener("click", () =>
        toggleApproval(review.ReviewID, !review.IsApproved)
      );
      actionsCell.appendChild(toggleApprovalButton);

      const detailsButton = document.createElement("button");
      detailsButton.className = "button button-small button-edit";
      detailsButton.textContent = "Деталі";
      detailsButton.addEventListener("click", () => openReviewModal(review));
      actionsCell.appendChild(detailsButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteReview(review.ReviewID, review.UserName)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  function showLoader() {
    if (reviewsLoader) reviewsLoader.style.display = "block";
    if (reviewsError) reviewsError.style.display = "none";
    if (reviewsNoResults) reviewsNoResults.style.display = "none";
  }
  function showError(message) {
    if (reviewsLoader) reviewsLoader.style.display = "none";
    if (reviewsError) {
      reviewsError.textContent = `Помилка: ${message}`;
      reviewsError.style.display = "block";
    }
    if (reviewsNoResults) reviewsNoResults.style.display = "none";
  }
  function showNoResults() {
    if (reviewsLoader) reviewsLoader.style.display = "none";
    if (reviewsError) reviewsError.style.display = "none";
    if (reviewsNoResults) reviewsNoResults.style.display = "block";
  }
  function hideMessages() {
    if (reviewsLoader) reviewsLoader.style.display = "none";
    if (reviewsError) reviewsError.style.display = "none";
    if (reviewsNoResults) reviewsNoResults.style.display = "none";
  }

  async function openReviewModal(review) {
    currentEditingReviewId = review.ReviewID;
    if (modalTitle)
      modalTitle.textContent = `Редагування Відгуку Користувача: ${review.UserName}`;

    if (modalReviewAuthor)
      modalReviewAuthor.textContent = `${review.UserName || "N/A"} (Email: ${
        review.UserEmail || "не вказано"
      })`;
    if (modalReviewService)
      modalReviewService.textContent = review.ServiceName
        ? `${review.ServiceName}`
        : "Загальний відгук про агентство";

    if (modalReviewDate)
      modalReviewDate.textContent = review.ReviewDate
        ? new Date(review.ReviewDate).toLocaleString("uk-UA", {
            dateStyle: "long",
            timeStyle: "short",
          })
        : "N/A";

    if (modalReviewRatingDisplay) {
      const ratingValue = review.Rating;

      if (
        ratingValue !== null &&
        ratingValue !== undefined &&
        String(ratingValue).trim() !== ""
      ) {
        const numericRating = parseInt(ratingValue, 10);
        if (!isNaN(numericRating) && numericRating >= 1 && numericRating <= 5) {
          modalReviewRatingDisplay.textContent = `Рейтинг: ${numericRating} / 5`;
        } else {
          modalReviewRatingDisplay.textContent = "Рейтинг: N/A";
        }
      } else {
        modalReviewRatingDisplay.textContent = "Рейтинг: N/A";
      }
    }

    if (modalReviewText) modalReviewText.value = review.ReviewText || "";
    if (modalReviewStatusSelect)
      modalReviewStatusSelect.value = review.IsApproved ? "1" : "0";

    if (reviewFormMessage) {
      reviewFormMessage.textContent = "";
      reviewFormMessage.className = "form-message";
    }
    if (reviewModal) reviewModal.classList.add("active");
  }

  if (closeModalButton)
    closeModalButton.addEventListener("click", () => {
      if (reviewModal) reviewModal.classList.remove("active");
    });
  window.addEventListener("click", (event) => {
    if (event.target === reviewModal && reviewModal)
      reviewModal.classList.remove("active");
  });

  if (saveReviewChangesBtn) {
    saveReviewChangesBtn.addEventListener("click", async () => {
      if (!currentEditingReviewId) return;
      if (reviewFormMessage) {
        reviewFormMessage.textContent = "Збереження...";
        reviewFormMessage.className = "form-message info";
      }
      const updateData = {
        reviewText: modalReviewText ? modalReviewText.value.trim() : undefined,
        isApproved: modalReviewStatusSelect
          ? modalReviewStatusSelect.value === "1"
          : undefined,
      };
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      if (
        updateData.hasOwnProperty("reviewText") &&
        updateData.reviewText === ""
      ) {
        if (reviewFormMessage) {
          reviewFormMessage.textContent =
            "Текст відгуку не може бути порожнім.";
          reviewFormMessage.className = "form-message error";
        }
        return;
      }
      if (Object.keys(updateData).length === 0) {
        if (reviewFormMessage) {
          reviewFormMessage.textContent = "Немає даних для оновлення.";
          reviewFormMessage.className = "form-message info";
        }
        return;
      }
      try {
        const response = await fetch(
          `${API_URL_REVIEWS}/${currentEditingReviewId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
          }
        );
        const result = await response.json();
        if (response.ok) {
          if (reviewFormMessage) {
            reviewFormMessage.textContent =
              result.message || "Відгук успішно оновлено!";
            reviewFormMessage.classList.add("success");
            reviewFormMessage.classList.remove("info", "error");
          }
          fetchAndDisplayReviews();
          setTimeout(() => {
            if (reviewModal) reviewModal.classList.remove("active");
          }, 1500);
        } else {
          if (reviewFormMessage) {
            reviewFormMessage.textContent =
              result.message || "Помилка оновлення відгуку.";
            reviewFormMessage.classList.add("error");
            reviewFormMessage.classList.remove("info", "success");
          }
        }
      } catch (error) {
        console.error("Error updating review:", error);
        if (reviewFormMessage) {
          reviewFormMessage.textContent = "Сталася помилка сервера.";
          reviewFormMessage.classList.add("error");
          reviewFormMessage.classList.remove("info", "success");
        }
      }
    });
  }

  async function updateApprovalStatus(reviewId, newApproveStatus) {
    try {
      const response = await fetch(`${API_URL_REVIEWS}/${reviewId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approve: newApproveStatus }),
      });
      const result = await response.json();
      if (response.ok) {
        fetchAndDisplayReviews();
      } else {
        alert(
          `Помилка при зміні статусу: ${result.message || "Невідома помилка"}`
        );
      }
    } catch (error) {
      console.error("Error updating approval status:", error);
      alert("Сталася помилка сервера при оновленні статусу.");
    }
  }
  function toggleApproval(reviewId, newApproveStatus) {
    updateApprovalStatus(reviewId, newApproveStatus);
  }

  async function deleteReview(reviewId, authorName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити відгук від "${authorName || "N/A"}"?`
      )
    )
      return;
    try {
      const response = await fetch(`${API_URL_REVIEWS}/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      let result = {
        message: `Сталася помилка при видаленні відгуку ID ${reviewId}`,
      };
      if (response.ok) {
        try {
          const textResponse = await response.text();
          if (textResponse) {
            result = JSON.parse(textResponse);
          } else {
            result.message = "Відгук успішно видалено (без тіла відповіді).";
          }
        } catch (e) {
          result.message = "Відгук успішно видалено (відповідь не JSON).";
        }
      } else {
        try {
          result = await response.json();
        } catch (e) {
          result.message = `Помилка ${response.status}: ${response.statusText}`;
        }
      }
      alert(
        result.message ||
          (response.ok ? "Відгук видалено" : "Помилка видалення")
      );
      if (response.ok) {
        fetchAndDisplayReviews();
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Сталася помилка сервера при видаленні.");
    }
  }

  let searchTimeout;
  if (reviewSearchInput)
    reviewSearchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(fetchAndDisplayReviews, 500);
    });
  if (approvalStatusFilter)
    approvalStatusFilter.addEventListener("change", fetchAndDisplayReviews);
  if (serviceFilterSelect)
    serviceFilterSelect.addEventListener("change", fetchAndDisplayReviews);

  if (token) {
    if (typeof loadServicesForFilter === "function") loadServicesForFilter();
    if (typeof fetchAndDisplayReviews === "function") fetchAndDisplayReviews();
  } else {
    showError("Необхідна авторизація для доступу до цієї сторінки.");
    const mainContentArea = document.querySelector(".content-area");
    if (mainContentArea) mainContentArea.style.display = "none";
  }
});
