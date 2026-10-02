import './style.css';
import { getUsers, createUser, updateUser, deleteUser } from './api.js';

// State
let users = [];
let userToDelete = null;

// DOM Elements
const userForm = document.getElementById('userForm');
const nomeInput = document.getElementById('nome');
const sobrenomeInput = document.getElementById('sobrenome');
const nomeError = document.getElementById('nomeError');
const sobrenomeError = document.getElementById('sobrenomeError');
const btnSubmit = document.getElementById('btnSubmit');

const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const userList = document.getElementById('userList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');

const totalUsersCount = document.getElementById('totalUsersCount');
const latestUserLabel = document.getElementById('latestUserLabel');
const btnRefresh = document.getElementById('btnRefresh');
const btnExportJson = document.getElementById('btnExportJson');
const btnExportCsv = document.getElementById('btnExportCsv');

// Edit Modal
const editModal = document.getElementById('editModal');
const editUserForm = document.getElementById('editUserForm');
const editUserIdInput = document.getElementById('editUserId');
const editNomeInput = document.getElementById('editNome');
const editSobrenomeInput = document.getElementById('editSobrenome');
const editNomeError = document.getElementById('editNomeError');
const editSobrenomeError = document.getElementById('editSobrenomeError');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnSaveEdit = document.getElementById('btnSaveEdit');

// Delete Modal
const confirmModal = document.getElementById('confirmModal');
const confirmModalText = document.getElementById('confirmModalText');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadUsers();
  if (nomeInput) nomeInput.focus();
});

function setupEventListeners() {
  // Create User
  if (userForm) {
    userForm.addEventListener('submit', handleCreateUser);
  }

  // Live input validations
  if (nomeInput) {
    nomeInput.addEventListener('input', () => clearFieldError(nomeInput, nomeError));
  }
  if (sobrenomeInput) {
    sobrenomeInput.addEventListener('input', () => clearFieldError(sobrenomeInput, sobrenomeError));
  }
  if (editNomeInput) {
    editNomeInput.addEventListener('input', () => clearFieldError(editNomeInput, editNomeError));
  }
  if (editSobrenomeInput) {
    editSobrenomeInput.addEventListener('input', () => clearFieldError(editSobrenomeInput, editSobrenomeError));
  }

  // Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.add('hidden');
      renderUsers();
      searchInput.focus();
    });
  }

  // Refresh and Exports
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadUsers();
      showToast('Lista atualizada com sucesso.', 'info');
    });
  }
  if (btnExportJson) {
    btnExportJson.addEventListener('click', exportToJson);
  }
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportToCsv);
  }

  // Edit Modal
  if (editUserForm) {
    editUserForm.addEventListener('submit', handleSaveEdit);
  }
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', closeEditModal);
  }
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Delete Modal
  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', closeDeleteModal);
  }
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeDeleteModal();
    });
  }
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
    }
    // Press '/' to search if not already in input
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      searchInput?.focus();
    }
  });
}

// Fetch users from SQLite backend
async function loadUsers() {
  try {
    showLoading(true);
    const res = await getUsers();
    if (res.success) {
      users = res.data || [];
      renderUsers();
      updateMetrics();
    } else {
      showToast(res.error || 'Erro ao carregar dados.', 'error');
    }
  } catch (error) {
    showToast('Falha na comunicação com o backend SQLite.', 'error');
  } finally {
    showLoading(false);
  }
}

// Create new user
async function handleCreateUser(e) {
  e.preventDefault();

  const nome = (nomeInput?.value || '').trim();
  const sobrenome = (sobrenomeInput?.value || '').trim();

  let hasError = false;
  if (!nome) {
    showFieldError(nomeInput, nomeError, 'Por favor, informe o nome');
    hasError = true;
  }
  if (!sobrenome) {
    showFieldError(sobrenomeInput, sobrenomeError, 'Por favor, informe o sobrenome');
    hasError = true;
  }

  if (hasError) return;

  setSubmitting(true);

  try {
    const res = await createUser(nome, sobrenome);
    if (res.success) {
      showToast(res.message || 'Usuário cadastrado com sucesso!', 'success');
      userForm.reset();
      nomeInput.focus();
      users.unshift(res.data);
      renderUsers();
      updateMetrics();
    } else {
      showToast(res.error || 'Erro ao cadastrar.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro de conexão com o servidor.', 'error');
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
  editModal.classList.remove('hidden');
  setTimeout(() => editNomeInput.focus(), 50);
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editUserForm.reset();
}

// Save Edit
async function handleSaveEdit(e) {
  e.preventDefault();

  const id = editUserIdInput.value;
  const nome = (editNomeInput?.value || '').trim();
  const sobrenome = (editSobrenomeInput?.value || '').trim();

  let hasError = false;
  if (!nome) {
    showFieldError(editNomeInput, editNomeError, 'Informe o nome');
    hasError = true;
  }
  if (!sobrenome) {
    showFieldError(editSobrenomeInput, editSobrenomeError, 'Informe o sobrenome');
    hasError = true;
  }

  if (hasError) return;

  setEditing(true);

  try {
    const res = await updateUser(id, nome, sobrenome);
    if (res.success) {
      showToast(res.message || 'Usuário atualizado com sucesso!', 'success');
      closeEditModal();
      const idx = users.findIndex((u) => String(u.id) === String(id));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...res.data };
      }
      renderUsers();
      updateMetrics();
    } else {
      showToast(res.error || 'Erro ao atualizar.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Erro ao comunicar com o servidor.', 'error');
  } finally {
    setEditing(false);
  }
}

// Open Delete Modal
function openDeleteModal(user) {
  userToDelete = user;
  confirmModalText.innerHTML = `Tem certeza que deseja remover <strong>${escapeHtml(user.nome)} ${escapeHtml(user.sobrenome)}</strong> (#${user.id}) do banco de dados?`;
  confirmModal.classList.remove('hidden');
}

function closeDeleteModal() {
  confirmModal.classList.add('hidden');
  userToDelete = null;
}

// Confirm Delete
async function handleConfirmDelete() {
  if (!userToDelete) return;

  const { id, nome } = userToDelete;
  closeDeleteModal();

  try {
    const res = await deleteUser(id);
    if (res.success) {
      showToast(res.message || `Usuário ${nome} removido.`, 'success');
      users = users.filter((u) => u.id !== id);
      renderUsers();
      updateMetrics();
    } else {
      showToast(res.error || 'Erro ao remover.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Falha ao tentar excluir usuário.', 'error');
  }
}

// Search
function handleSearch() {
  renderUsers();
}

// Render User List
function renderUsers() {
  const searchTerm = (searchInput?.value || '').toLowerCase().trim();
  if (btnClearSearch) {
    btnClearSearch.classList.toggle('hidden', searchTerm === '');
  }

  const filtered = users.filter((u) => {
    const fullName = `${u.nome} ${u.sobrenome}`.toLowerCase();
    return fullName.includes(searchTerm) || String(u.id).includes(searchTerm);
  });

  userList.innerHTML = '';

  if (users.length === 0) {
    emptyState?.classList.remove('hidden');
    noResultsState?.classList.add('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  if (filtered.length === 0) {
    noResultsState?.classList.remove('hidden');
    return;
  }

  noResultsState?.classList.add('hidden');

  filtered.forEach((user) => {
    const initials = getInitials(user.nome, user.sobrenome);
    const row = document.createElement('div');
    row.className = 'user-row';

    // Profile & Info
    const profileDiv = document.createElement('div');
    profileDiv.className = 'user-profile';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'user-avatar';
    avatarDiv.textContent = initials;
    avatarDiv.style.background = getAvatarGradient(user.nome + user.sobrenome);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'user-details';

    const fullNameSpan = document.createElement('span');
    fullNameSpan.className = 'user-fullname';
    fullNameSpan.textContent = `${user.nome} ${user.sobrenome}`;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'user-meta';

    const idBadge = document.createElement('span');
    idBadge.className = 'user-id-badge';
    idBadge.textContent = `#${user.id}`;

    const dateSpan = document.createElement('span');
    dateSpan.textContent = user.created_at ? formatDate(user.created_at) : 'Recente';

    metaDiv.appendChild(idBadge);
    metaDiv.appendChild(dateSpan);
    detailsDiv.appendChild(fullNameSpan);
    detailsDiv.appendChild(metaDiv);
    profileDiv.appendChild(avatarDiv);
    profileDiv.appendChild(detailsDiv);

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'user-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-icon btn-icon-edit';
    btnEdit.type = 'button';
    btnEdit.title = 'Editar usuário';
    btnEdit.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    btnEdit.addEventListener('click', () => openEditModal(user));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-icon btn-icon-delete';
    btnDelete.type = 'button';
    btnDelete.title = 'Excluir usuário';
    btnDelete.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    btnDelete.addEventListener('click', () => openDeleteModal(user));

    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDelete);

    row.appendChild(profileDiv);
    row.appendChild(actionsDiv);
    userList.appendChild(row);
  });
}

// Metrics
function updateMetrics() {
  if (totalUsersCount) {
    totalUsersCount.textContent = users.length;
  }
  if (latestUserLabel) {
    if (users.length > 0) {
      const latest = users[0];
      latestUserLabel.textContent = `${latest.nome} ${latest.sobrenome}`;
    } else {
      latestUserLabel.textContent = '—';
    }
  }
}

// Exports
function exportToJson() {
  if (users.length === 0) {
    showToast('Nenhum dado para exportar.', 'info');
    return;
  }
  const jsonStr = JSON.stringify(users, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `sqlite-usuarios-${Date.now()}.json`);
  showToast('Exportado para JSON!', 'success');
}

function exportToCsv() {
  if (users.length === 0) {
    showToast('Nenhum dado para exportar.', 'info');
    return;
  }
  const headers = ['ID', 'Nome', 'Sobrenome', 'CriadoEm'];
  const rows = users.map((u) => [
    u.id,
    `"${(u.nome || '').replace(/"/g, '""')}"`,
    `"${(u.sobrenome || '').replace(/"/g, '""')}"`,
    `"${u.created_at || ''}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `sqlite-usuarios-${Date.now()}.csv`);
  showToast('Exportado para CSV!', 'success');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// UI State Helpers
function showFieldError(input, errorElement, message) {
  if (input) input.style.borderColor = 'var(--danger)';
  if (errorElement) errorElement.textContent = message;
}

function clearFieldError(input, errorElement) {
  if (input) input.style.borderColor = '';
  if (errorElement) errorElement.textContent = '';
}

function setSubmitting(isLoading) {
  if (!btnSubmit) return;
  btnSubmit.disabled = isLoading;
  const text = btnSubmit.querySelector('.btn-text');
  const loader = btnSubmit.querySelector('.btn-loader');
  if (text) text.classList.toggle('hidden', isLoading);
  if (loader) loader.classList.toggle('hidden', !isLoading);
}

function setEditing(isLoading) {
  if (!btnSaveEdit) return;
  btnSaveEdit.disabled = isLoading;
  const text = btnSaveEdit.querySelector('.btn-text');
  const loader = btnSaveEdit.querySelector('.btn-loader');
  if (text) text.classList.toggle('hidden', isLoading);
  if (loader) loader.classList.toggle('hidden', !isLoading);
}

function showLoading(isLoading) {
  if (loadingState) {
    loadingState.classList.toggle('hidden', !isLoading);
  }
}

// Formatters & Utilities
function getInitials(nome, sobrenome) {
  const n = (nome || '').trim().charAt(0).toUpperCase();
  const s = (sobrenome || '').trim().charAt(0).toUpperCase();
  return `${n}${s}` || 'U';
}

function getAvatarGradient(str) {
  const gradients = [
    'linear-gradient(135deg, #6366f1, #ec4899)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #8b5cf6, #6366f1)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function formatDate(dateStr) {
  if (!dateStr) return 'Recente';
  try {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return 'Recente';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recente';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

// Toast
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
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
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
