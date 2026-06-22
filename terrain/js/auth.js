// DarAmanah Terrain — Auth module (field_agent only)
import { apiFetch, setTokens, clearTokens, getTokens } from './api.js';

const ALLOWED_ROLES = ['field_agent'];

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!ALLOWED_ROLES.includes(data.user.role)) {
    throw { message: 'Accès réservé aux intervenants terrain' };
  }
  setTokens(data.access_token, data.refresh_token);
  localStorage.setItem('da_terrain_user', JSON.stringify(data.user));
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
  try { return JSON.parse(localStorage.getItem('da_terrain_user')); } catch { return null; }
}

export { login, logout, isAuthenticated, getCachedUser, ALLOWED_ROLES };
