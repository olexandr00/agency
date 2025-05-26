// frontend/js/admin/crud-campaigns.js
document.addEventListener("DOMContentLoaded", () => {
  const API_URL_CAMPAIGNS = "http://localhost:3000/api/campaigns";
  const API_URL_CLIENTS = "http://localhost:3000/api/clients";
  const API_URL_EMPLOYEES = "http://localhost:3000/api/employees";
  const API_URL_SERVICES = "http://localhost:3000/api/services";
  const token = Auth.getToken();

  const campaignsTableBody = document.getElementById("campaignsTableBody");
  const campaignsLoader = document.getElementById("campaigns-loader");
  const campaignsError = document.getElementById("campaigns-error");
  const campaignsNoResults = document.getElementById("campaigns-no-results");
  const campaignSearchInput = document.getElementById("campaignSearchInput");
  const statusFilterSelect = document.getElementById("statusFilter");

  const addCampaignBtn = document.getElementById("addCampaignBtn");
  const campaignModal = document.getElementById("campaignModal");
  const closeModalButton = campaignModal.querySelector(".close-modal-button");
  const campaignForm = document.getElementById("campaignForm");
  const modalTitle = campaignModal.querySelector("#modalTitle");
  const campaignIdInput = document.getElementById("campaignId");
  const campaignFormMessage = document.getElementById("campaign-form-message");

  const clientIdSelect = document.getElementById("clientId");
  const responsibleEmployeeIdSelect = document.getElementById(
    "responsibleEmployeeId"
  );

  const campaignServicesSection = document.getElementById(
    "campaignServicesSection"
  );
  const selectServiceToAdd = document.getElementById("selectServiceToAdd");
  const serviceQuantityInput = document.getElementById("serviceQuantity");
  const addServiceToCampaignBtn = document.getElementById(
    "addServiceToCampaignBtn"
  );
  const campaignServicesListUl = document.getElementById(
    "campaignServicesList"
  );

  let currentCampaigns = [];
  let allClients = [];
  let allEmployees = [];
  let allServices = [];
  let currentEditingCampaignId = null;

  function translateCampaignStatus(status) {
    switch (status) {
      case "Planned":
        return "Запланована";
      case "Active":
        return "Активна";
      case "Completed":
        return "Завершена";
      case "On Hold":
        return "Призупинена";
      case "Cancelled":
        return "Скасована";
      default:
        return status;
    }
  }

  async function loadSelectData() {
    try {
      const clientsRes = await fetch(API_URL_CLIENTS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!clientsRes.ok) throw new Error("Не вдалося завантажити клієнтів");
      allClients = await clientsRes.json();
      clientIdSelect.innerHTML = '<option value="">Оберіть клієнта...</option>';
      allClients.forEach((c) =>
        clientIdSelect.add(
          new Option(
            c.ClientCompanyName ||
              `${c.ContactPersonLastName} ${c.ContactPersonFirstName}`,
            c.ClientID
          )
        )
      );

      const employeesRes = await fetch(API_URL_EMPLOYEES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!employeesRes.ok)
        throw new Error("Не вдалося завантажити працівників");
      allEmployees = await employeesRes
        .json()
        .then((emps) => emps.filter((e) => !e.DismissalDate));

      responsibleEmployeeIdSelect.innerHTML =
        '<option value="">Не призначено</option>';
      allEmployees.forEach((e) => {
        const fullName = `${e.LastName} ${e.FirstName}`;
        responsibleEmployeeIdSelect.add(new Option(fullName, e.EmployeeID));
      });

      const servicesRes = await fetch(API_URL_SERVICES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!servicesRes.ok) throw new Error("Не вдалося завантажити послуги");
      allServices = await servicesRes.json();
      selectServiceToAdd.innerHTML =
        '<option value="">Оберіть послугу...</option>';
      allServices.forEach((s) =>
        selectServiceToAdd.add(new Option(s.ServiceName, s.ServiceID))
      );
    } catch (error) {
      console.error("Error loading select data:", error);
      if (campaignFormMessage) {
        campaignFormMessage.textContent = error.message;
        campaignFormMessage.className = "form-message error";
      } else {
        showError(`Помилка завантаження даних для форми: ${error.message}`);
      }
    }
  }

  async function fetchAndDisplayCampaigns(searchTerm = "", status = "") {
    showLoader();
    try {
      let url = new URL(API_URL_CAMPAIGNS);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (status) url.searchParams.append("status", status);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: `Помилка сервера: ${response.status}` }));
        throw new Error(
          errData.message ||
            `Не вдалося завантажити кампанії: ${response.statusText}`
        );
      }
      currentCampaigns = await response.json();
      renderCampaignsTable(currentCampaigns);
    } catch (error) {
      showError(error.message);
    }
  }

  function renderCampaignsTable(campaigns) {
    hideMessages();
    campaignsTableBody.innerHTML = "";
    if (!campaigns || campaigns.length === 0) {
      showNoResults();
      return;
    }

    campaigns.forEach((camp) => {
      const row = campaignsTableBody.insertRow();
      row.insertCell().textContent = camp.CampaignName;
      row.insertCell().textContent =
        camp.ClientCompanyName ||
        (camp.ClientLastName
          ? `${camp.ClientLastName} ${camp.ClientFirstName}`
          : `ID: ${camp.ClientID}`);
      row.insertCell().textContent =
        camp.ResponsibleEmployeeName ||
        (camp.ResponsibleEmployeeID
          ? `ID: ${camp.ResponsibleEmployeeID}`
          : "-");
      const startDate = camp.StartDate
        ? new Date(camp.StartDate).toLocaleDateString("uk-UA")
        : "-";
      const endDate = camp.EndDate
        ? new Date(camp.EndDate).toLocaleDateString("uk-UA")
        : "-";
      row.insertCell().textContent = `${startDate} - ${endDate}`;
      const budgetCell = row.insertCell();
      budgetCell.textContent = camp.CampaignBudget
        ? parseFloat(camp.CampaignBudget).toFixed(2)
        : "-";
      budgetCell.style.textAlign = "right";

      row.insertCell().textContent = translateCampaignStatus(
        camp.CampaignStatus
      );

      const actionsCell = row.insertCell();
      actionsCell.className = "actions-cell";
      const editButton = document.createElement("button");
      editButton.className = "button button-small button-edit";
      editButton.textContent = "Ред.";
      editButton.addEventListener("click", () => openModalForEdit(camp));
      actionsCell.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className =
        "button button-small button-danger button-delete";
      deleteButton.textContent = "Вид.";
      deleteButton.addEventListener("click", () =>
        deleteCampaign(camp.CampaignID, camp.CampaignName)
      );
      actionsCell.appendChild(deleteButton);
    });
  }

  function showLoader() {
    campaignsLoader.style.display = "block";
    campaignsError.style.display = "none";
    campaignsNoResults.style.display = "none";
  }
  function showError(message) {
    campaignsLoader.style.display = "none";
    campaignsError.textContent = `Помилка: ${message}`;
    campaignsError.style.display = "block";
    campaignsNoResults.style.display = "none";
  }
  function showNoResults() {
    campaignsLoader.style.display = "none";
    campaignsError.style.display = "none";
    campaignsNoResults.style.display = "block";
  }
  function hideMessages() {
    campaignsLoader.style.display = "none";
    campaignsError.style.display = "none";
    campaignsNoResults.style.display = "none";
  }

  function openModal(title = "Додати Кампанію", campaign = null) {
    modalTitle.textContent = title;
    campaignForm.reset();
    campaignIdInput.value = "";
    campaignFormMessage.textContent = "";
    campaignFormMessage.className = "form-message";
    currentEditingCampaignId = null;

    campaignServicesSection.style.display = "none";
    campaignServicesListUl.innerHTML = "";

    if (campaign) {
      currentEditingCampaignId = campaign.CampaignID;
      campaignIdInput.value = campaign.CampaignID;
      campaignForm.campaignName.value = campaign.CampaignName;
      campaignForm.clientId.value = campaign.ClientID;
      campaignForm.responsibleEmployeeId.value =
        campaign.ResponsibleEmployeeID || "";
      campaignForm.startDate.value = campaign.StartDate
        ? campaign.StartDate.split("T")[0]
        : "";
      campaignForm.endDate.value = campaign.EndDate
        ? campaign.EndDate.split("T")[0]
        : "";
      campaignForm.campaignBudget.value = campaign.CampaignBudget
        ? parseFloat(campaign.CampaignBudget).toFixed(2)
        : "";
      campaignForm.campaignStatus.value = campaign.CampaignStatus;
      campaignForm.campaignDescription.value =
        campaign.CampaignDescription || "";

      campaignServicesSection.style.display = "block";
      loadAndDisplayCampaignServices(campaign.CampaignID);
    }
    campaignModal.classList.add("active");
  }

  function closeModal() {
    campaignModal.classList.remove("active");
  }
  function openModalForEdit(campaign) {
    openModal("Редагувати Кампанію", campaign);
  }

  addCampaignBtn.addEventListener("click", () => openModal());
  closeModalButton.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === campaignModal) closeModal();
  });

  campaignForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = campaignIdInput.value;
    const isEditMode = !!id;

    const campaignData = {
      campaignName: campaignForm.campaignName.value,
      clientId: parseInt(campaignForm.clientId.value),
      responsibleEmployeeId: campaignForm.responsibleEmployeeId.value
        ? parseInt(campaignForm.responsibleEmployeeId.value)
        : null,
      startDate: campaignForm.startDate.value || null,
      endDate: campaignForm.endDate.value || null,
      campaignBudget: campaignForm.campaignBudget.value
        ? parseFloat(campaignForm.campaignBudget.value)
        : null,
      campaignStatus: campaignForm.campaignStatus.value,
      campaignDescription: campaignForm.campaignDescription.value || null,
    };

    if (!campaignData.campaignName || !campaignData.clientId) {
      campaignFormMessage.textContent =
        "Назва кампанії та клієнт є обов'язковими.";
      campaignFormMessage.className = "form-message error";
      return;
    }

    const url = isEditMode ? `${API_URL_CAMPAIGNS}/${id}` : API_URL_CAMPAIGNS;
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });
      const result = await response.json();

      if (response.ok) {
        campaignFormMessage.textContent =
          result.message ||
          `Кампанію успішно ${isEditMode ? "оновлено" : "створено"}!`;
        campaignFormMessage.className = "form-message success";
        fetchAndDisplayCampaigns(
          campaignSearchInput.value.trim(),
          statusFilterSelect.value
        );

        if (
          !isEditMode &&
          result.campaign &&
          (result.campaign.id || result.campaign.CampaignID)
        ) {
          const newCampaignId =
            result.campaign.id || result.campaign.CampaignID;
          const newCampaignDataForEditRes = await fetch(
            `${API_URL_CAMPAIGNS}/${newCampaignId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (newCampaignDataForEditRes.ok) {
            const newCampaignDataForEdit =
              await newCampaignDataForEditRes.json();
            openModalForEdit(newCampaignDataForEdit);
          } else {
            setTimeout(closeModal, 1500);
          }
        } else if (isEditMode) {
          // Залишаємось в модалці
        } else {
          setTimeout(closeModal, 1500);
        }
      } else {
        campaignFormMessage.textContent =
          result.message || "Помилка збереження кампанії.";
        campaignFormMessage.className = "form-message error";
      }
    } catch (error) {
      console.error(`Error saving campaign:`, error);
      campaignFormMessage.textContent = `Помилка збереження: ${error.message}`;
      campaignFormMessage.className = "form-message error";
    }
  });

  async function loadAndDisplayCampaignServices(campId) {
    campaignServicesListUl.innerHTML = "<li>Завантаження послуг...</li>";
    try {
      const response = await fetch(`${API_URL_CAMPAIGNS}/${campId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Не вдалося завантажити деталі кампанії для послуг");
      const campaignDetails = await response.json();

      console.log(
        "Campaign Details Received for Services:",
        JSON.stringify(campaignDetails, null, 2)
      );

      campaignServicesListUl.innerHTML = "";
      if (
        campaignDetails &&
        campaignDetails.services &&
        campaignDetails.services.length > 0
      ) {
        campaignDetails.services.forEach((cs) => {
          console.log(
            "Processing service item (cs) for display:",
            JSON.stringify(cs, null, 2)
          );

          const li = document.createElement("li");

          li.textContent = `${cs.ServiceName} (К-сть: ${cs.ServiceQuantity})`;

          const removeBtn = document.createElement("button");
          removeBtn.className = "button button-small button-danger";
          removeBtn.textContent = "Вид.";
          removeBtn.onclick = () =>
            removeServiceFromCampaign(campId, cs.ServiceID);
          li.appendChild(removeBtn);
          campaignServicesListUl.appendChild(li);
        });
      } else {
        campaignServicesListUl.innerHTML = "<li>Немає доданих послуг.</li>";
      }
    } catch (error) {
      console.error("Error loading campaign services:", error);
      campaignServicesListUl.innerHTML = `<li>Помилка завантаження послуг: ${error.message}</li>`;
    }
  }

  addServiceToCampaignBtn.addEventListener("click", async () => {
    const serviceId = selectServiceToAdd.value;
    const quantity = parseInt(serviceQuantityInput.value);

    if (
      !currentEditingCampaignId ||
      !serviceId ||
      isNaN(quantity) ||
      quantity < 1
    ) {
      alert("Оберіть послугу та вкажіть коректну кількість (більше 0).");
      return;
    }

    let response;
    try {
      const payload = { serviceId: parseInt(serviceId), quantity };
      console.log(
        "Attempting to add service. CampaignID:",
        currentEditingCampaignId,
        "Payload:",
        JSON.stringify(payload)
      );

      response = await fetch(
        `${API_URL_CAMPAIGNS}/${currentEditingCampaignId}/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (response.ok) {
        console.log("Service added successfully:", result);
        loadAndDisplayCampaignServices(currentEditingCampaignId);
        serviceQuantityInput.value = "1";
        selectServiceToAdd.value = "";
      } else {
        console.error(
          "Error adding service. Status:",
          response.status,
          "Server Response:",
          result
        );
        alert(
          `Помилка додавання послуги: ${result.message || response.statusText}`
        );
      }
    } catch (error) {
      console.error(
        "Catch block: Error adding service to campaign (client-side fetch/json error):",
        error
      );
      if (response) {
        console.error(
          "Catch block: Response status that led to error:",
          response.status,
          response.statusText
        );
        try {
          const errorText = await response.text();
          console.error("Catch block: Raw error response text:", errorText);
          alert(
            `Серверна помилка при додаванні послуги. Деталі: ${errorText.substring(
              0,
              100
            )}...`
          );
        } catch (e) {
          alert(
            "Серверна помилка при додаванні послуги (не вдалося отримати деталі)."
          );
        }
      } else {
        alert("Серверна помилка при додаванні послуги (немає відповіді).");
      }
    }
  });

  async function removeServiceFromCampaign(campId, serviceId) {
    if (!confirm("Видалити цю послугу з кампанії?")) return;
    try {
      const response = await fetch(
        `${API_URL_CAMPAIGNS}/${campId}/services/${serviceId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        loadAndDisplayCampaignServices(campId);
      } else {
        const result = await response.json().catch(() => ({}));
        alert(
          `Помилка видалення послуги: ${result.message || response.statusText}`
        );
      }
    } catch (error) {
      alert("Серверна помилка при видаленні послуги.");
    }
  }

  async function deleteCampaign(campaignId, campaignName) {
    if (
      !confirm(
        `Ви впевнені, що хочете видалити кампанію "${
          campaignName || "ID: " + campaignId
        }"? Це також видалить всі пов'язані послуги для цієї кампанії.`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL_CAMPAIGNS}/${campaignId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        let message = "Кампанію успішно видалено!";
        if (response.status !== 204) {
          const result = await response.json().catch(() => null);
          if (result && result.message) message = result.message;
        }
        alert(message);
        fetchAndDisplayCampaigns(
          campaignSearchInput.value.trim(),
          statusFilterSelect.value
        );
      } else {
        const result = await response.json().catch(() => ({
          message: `Не вдалося видалити кампанію: ${response.statusText}`,
        }));
        alert(`Помилка видалення: ${result.message}`);
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
      alert(`Серверна помилка при видаленні кампанії: ${error.message}`);
    }
  }

  statusFilterSelect.addEventListener("change", () => {
    fetchAndDisplayCampaigns(
      campaignSearchInput.value.trim(),
      statusFilterSelect.value
    );
  });
  let searchTimeout;
  campaignSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchAndDisplayCampaigns(
        campaignSearchInput.value.trim(),
        statusFilterSelect.value
      );
    }, 500);
  });

  if (token) {
    loadSelectData();
    fetchAndDisplayCampaigns();
  } else {
    showError("Необхідна авторизація для перегляду кампаній.");
    const mainContent = document.querySelector(".content-area");
    if (mainContent) mainContent.style.display = "none";
  }
});
