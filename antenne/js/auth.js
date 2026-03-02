// DarAmanah Antenne — Auth module (admin-only access)
import { apiFetch, setTokens, clearTokens, getTokens } from './api.js';

const ALLOWED_ROLES = ['branch_admin', 'super_admin'];

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!ALLOWED_ROLES.includes(data.user.role)) {
    throw { message: 'Accès réservé aux administrateurs d\'antenne' };
  }
  setTokens(data.access_token, data.refresh_token);
  localStorage.setItem('da_ant_user', JSON.stringify(data.user));
  // Fetch branch info
  try {
    const branchData = await apiFetch('/api/admin/branch');
    localStorage.setItem('da_ant_branch', JSON.stringify(branchData.branch));
  } catch {}
  return data.user;
}

function logout() {
  const { access } = getTokens();
  if (access) apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearTokens();
  window.location.hash = '#/login';
}

function isAuthenticated() { return !!getTokens().access; }

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('da_ant_user')); } catch { return null; }
}

function getCachedBranch() {
  try { return JSON.parse(localStorage.getItem('da_ant_branch')); } catch { return null; }
}

export { login, logout, isAuthenticated, getCachedUser, getCachedBranch, ALLOWED_ROLES };
