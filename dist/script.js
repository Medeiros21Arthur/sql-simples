// DOM Elements - Create Form
const userForm = document.getElementById("userForm");
const nomeInput = document.getElementById("nome");
const sobrenomeInput = document.getElementById("sobrenome");
const nomeError = document.getElementById("nomeError");
const sobrenomeError = document.getElementById("sobrenomeError");
const btnSubmit = document.getElementById("btnSubmit");
const btnText = btnSubmit ? btnSubmit.querySelector(".btn-text") : null;
const btnLoader = btnSubmit ? btnSubmit.querySelector(".btn-loader") : null;

// Search & List
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const userList = document.getElementById("userList");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const noResultsState = document.getElementById("noResultsState");

// Metrics
const totalUsersCount = document.getElementById("totalUsersCount");
const latestUserLabel = document.getElementById("latestUserLabel");

// Edit Modal
const editModal = document.getElementById("editModal");
const editUserForm = document.getElementById("editUserForm");
const editUserIdInput = document.getElementById("editUserId");
const editNomeInput = document.getElementById("editNome");
const editSobrenomeInput = document.getElementById("editSobrenome");
const editNomeError = document.getElementById("editNomeError");
const editSobrenomeError = document.getElementById("editSobrenomeError");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const btnSaveEdit = document.getElementById("btnSaveEdit");

// Delete Confirmation Modal
const confirmModal = document.getElementById("confirmModal");
const confirmModalText = document.getElementById("confirmModalText");
const btnCancelDelete = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");

// Toast
const toastContainer = document.getElementById("toastContainer");

// Application State
let users = [];
let userToDelete = null;

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  fetchUsers();
  setupEventListeners();
  if (nomeInput) nomeInput.focus();
});

function setupEventListeners() {
  // Form Submit (Create)
  if (userForm) {
    userForm.addEventListener("submit", handleSubmitUser);
  }

  // Clear validation errors on typing
  if (nomeInput) {
    nomeInput.addEventListener("input", () => clearFieldError(nomeInput, nomeError));
  }
  if (sobrenomeInput) {
    sobrenomeInput.addEventListener("input", () => clearFieldError(sobrenomeInput, sobrenomeError));
  }
  if (editNomeInput) {
    editNomeInput.addEventListener("input", () => clearFieldError(editNomeInput, editNomeError));
  }
  if (editSobrenomeInput) {
    editSobrenomeInput.addEventListener("input", () => clearFieldError(editSobrenomeInput, editSobrenomeError));
  }

  // Search Filter
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
      searchInput.value = "";
      btnClearSearch.classList.add("hidden");
      renderUsers();
    });
  }

  // Edit Modal Events
  if (editUserForm) {
    editUserForm.addEventListener("submit", handleSaveEdit);
  }
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", closeEditModal);
  }
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Delete Modal Events
  if (btnCancelDelete) {
    btnCancelDelete.addEventListener("click", closeDeleteModal);
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) closeDeleteModal();
    });
  }
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", executeDelete);
  }

  // Global Escape key handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEditModal();
      closeDeleteModal();
    }
  });
}

// Fetch all users from API
async function fetchUsers() {
  try {
    showLoading(true);
    const response = await fetch("/api/users");
    const data = await response.json();

    if (data.success) {
      users = data.data || [];
      renderUsers();
      updateMetrics();
    } else {
      showToast(data.error || "Erro ao carregar usuários.", "error");
    }
  } catch (error) {
    showToast("Não foi possível conectar ao servidor backend.", "error");
  } finally {
    showLoading(false);
  }
}

// Handle User Creation
async function handleSubmitUser(e) {
  e.preventDefault();

  const nome = nomeInput.value.trim();
  const sobrenome = sobrenomeInput.value.trim();

  let hasError = false;
  if (!nome) {
    showFieldError(nomeInput, nomeError, "Informe o nome");
    hasError = true;
  }
  if (!sobrenome) {
    showFieldError(sobrenomeInput, sobrenomeError, "Informe o sobrenome");
    hasError = true;
  }

  if (hasError) return;

  setSubmitting(true);

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, sobrenome }),
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || "Usuário cadastrado com sucesso!", "success");
      userForm.reset();
      nomeInput.focus();
      // Adiciona o novo usuário no topo
      users.unshift(result.data);
      renderUsers();
      updateMetrics();
    } else {
      showToast(result.error || "Erro ao cadastrar usuário.", "error");
    }
  } catch (error) {
    showToast("Falha de comunicação ao cadastrar usuário.", "error");
  } finally {
    setSubmitting(false);
  }
}

// Open Edit Modal
function openEditModal(user) {
  editUserIdInput.value = user.id;
  editNomeInput.value = user.nome;
  editSobrenomeInput.value = user.sobrenome;
  clearFieldError(editNomeInput, editNomeError);
  clearFieldError(editSobrenomeInput, editSobrenomeError);
  editModal.classList.remove("hidden");
  setTimeout(() => editNomeInput.focus(), 50);
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editUserForm.reset();
}

// Handle Save Edit
async function handleSaveEdit(e) {
  e.preventDefault();

  const id = editUserIdInput.value;
  const nome = editNomeInput.value.trim();
  const sobrenome = editSobrenomeInput.value.trim();

  let hasError = false;
  if (!nome) {
    showFieldError(editNomeInput, editNomeError, "Informe o nome");
    hasError = true;
  }
  if (!sobrenome) {
    showFieldError(editSobrenomeInput, editSobrenomeError, "Informe o sobrenome");
    hasError = true;
  }

  if (hasError) return;

  setEditing(true);

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, sobrenome }),
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || "Usuário atualizado com sucesso!", "success");
      closeEditModal();
      // Atualiza localmente
      const index = users.findIndex((u) => String(u.id) === String(id));
      if (index !== -1) {
        users[index] = { ...users[index], ...result.data };
      }
      renderUsers();
      updateMetrics();
    } else {
      showToast(result.error || "Erro ao atualizar usuário.", "error");
    }
  } catch (error) {
    showToast("Falha na comunicação ao tentar atualizar.", "error");
  } finally {
    setEditing(false);
  }
}

// Render Users List
function renderUsers() {
  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase().trim();
  if (btnClearSearch) {
    btnClearSearch.classList.toggle("hidden", searchTerm === "");
  }

  const filtered = users.filter((u) => {
    const fullName = `${u.nome} ${u.sobrenome}`.toLowerCase();
    return fullName.includes(searchTerm) || String(u.id).includes(searchTerm);
  });

  userList.innerHTML = "";

  if (users.length === 0) {
    emptyState.classList.remove("hidden");
    noResultsState.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  if (filtered.length === 0) {
    noResultsState.classList.remove("hidden");
    return;
  }

  noResultsState.classList.add("hidden");

  filtered.forEach((user) => {
    const initials = getInitials(user.nome, user.sobrenome);
    const row = document.createElement("div");
    row.className = "user-row";

    // Build Row Structure
    const profileDiv = document.createElement("div");
    profileDiv.className = "user-profile";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "user-avatar";
    avatarDiv.textContent = initials;

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "user-details";

    const fullNameSpan = document.createElement("span");
    fullNameSpan.className = "user-fullname";
    fullNameSpan.textContent = `${user.nome} ${user.sobrenome}`;

    const metaDiv = document.createElement("div");
    metaDiv.className = "user-meta";

    const idBadge = document.createElement("span");
    idBadge.className = "user-id-badge";
    idBadge.textContent = `#${user.id}`;

    const dateSpan = document.createElement("span");
    dateSpan.textContent = user.created_at ? formatDate(user.created_at) : "Recente";

    metaDiv.appendChild(idBadge);
    metaDiv.appendChild(dateSpan);
    detailsDiv.appendChild(fullNameSpan);
    detailsDiv.appendChild(metaDiv);
    profileDiv.appendChild(avatarDiv);
    profileDiv.appendChild(detailsDiv);

    // Action Buttons (Edit + Delete)
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "user-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-icon btn-icon-edit";
    btnEdit.type = "button";
    btnEdit.title = "Editar usuário";
    btnEdit.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    btnEdit.addEventListener("click", () => openEditModal(user));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-icon btn-icon-delete";
    btnDelete.type = "button";
    btnDelete.title = "Excluir usuário";
    btnDelete.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    btnDelete.addEventListener("click", () => openDeleteModal(user));

    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDelete);

    row.appendChild(profileDiv);
    row.appendChild(actionsDiv);
    userList.appendChild(row);
  });
}

// Prompt Delete Confirmation Modal
function openDeleteModal(user) {
  userToDelete = user;
  confirmModalText.innerHTML = `Tem certeza que deseja remover <strong>${escapeHtml(user.nome)} ${escapeHtml(user.sobrenome)}</strong> (#${user.id}) do banco de dados?`;
  confirmModal.classList.remove("hidden");
}

function closeDeleteModal() {
  confirmModal.classList.add("hidden");
  userToDelete = null;
}

// Execute Delete API
async function executeDelete() {
  if (!userToDelete) return;

  const { id, nome } = userToDelete;
  closeDeleteModal();

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || `Usuário ${nome} removido.`, "success");
      users = users.filter((u) => u.id !== id);
      renderUsers();
      updateMetrics();
    } else {
      showToast(result.error || "Erro ao remover usuário.", "error");
    }
  } catch (error) {
    showToast("Falha na comunicação ao tentar remover.", "error");
  }
}

// Handle Search Input
function handleSearch() {
  renderUsers();
}

// Update Top Metrics
function updateMetrics() {
  if (totalUsersCount) {
    totalUsersCount.textContent = users.length;
  }
  if (latestUserLabel) {
    if (users.length > 0) {
      const latest = users[0];
      latestUserLabel.textContent = `${latest.nome} ${latest.sobrenome}`;
    } else {
      latestUserLabel.textContent = "—";
    }
  }
}

// Helpers: Validation UI
function showFieldError(input, errorElement, message) {
  if (input) input.style.borderColor = "var(--danger)";
  if (errorElement) errorElement.textContent = message;
}

function clearFieldError(input, errorElement) {
  if (input) input.style.borderColor = "";
  if (errorElement) errorElement.textContent = "";
}

function setSubmitting(isLoading) {
  if (!btnSubmit) return;
  btnSubmit.disabled = isLoading;
  if (btnText) btnText.classList.toggle("hidden", isLoading);
  if (btnLoader) btnLoader.classList.toggle("hidden", !isLoading);
}

function setEditing(isLoading) {
  if (!btnSaveEdit) return;
  btnSaveEdit.disabled = isLoading;
  const editBtnText = btnSaveEdit.querySelector(".btn-text");
  const editBtnLoader = btnSaveEdit.querySelector(".btn-loader");
  if (editBtnText) editBtnText.classList.toggle("hidden", isLoading);
  if (editBtnLoader) editBtnLoader.classList.toggle("hidden", !isLoading);
}

function showLoading(isLoading) {
  if (loadingState) {
    loadingState.classList.toggle("hidden", !isLoading);
  }
}

// Helper: Initials
function getInitials(nome, sobrenome) {
  const n = (nome || "").trim().charAt(0).toUpperCase();
  const s = (sobrenome || "").trim().charAt(0).toUpperCase();
  return `${n}${s}` || "U";
}

// Helper: Format Date
function formatDate(dateStr) {
  if (!dateStr) return "Recente";
  try {
    const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return "Recente";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recente";
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

// Helper: Toast Notifications
function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#10b981"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#ef4444"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#6366f1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  };

  toast.innerHTML = `
    ${iconMap[type] || iconMap.info}
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
