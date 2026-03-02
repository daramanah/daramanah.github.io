// DarAmanah — Auth module (login, register, logout, session check)

import { apiFetch, setTokens, clearTokens, getTokens } from './api.js';

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.access_token, data.refresh_token);
  localStorage.setItem('da_user', JSON.stringify(data.user));
  return data.user;
}

async function register(fields) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  setTokens(data.access_token, data.refresh_token);
  localStorage.setItem('da_user', JSON.stringify(data.user));
  return data.user;
}

function logout() {
  const { access } = getTokens();
  if (access) {
    // Fire and forget
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }
  clearTokens();
  window.location.hash = '#/login';
}

function isAuthenticated() {
  return !!getTokens().access;
}

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem('da_user'));
  } catch {
    return null;
  }
}

async function fetchUser() {
  const data = await apiFetch('/api/auth/me');
  localStorage.setItem('da_user', JSON.stringify(data.user));
  return data.user;
}

async function updateProfile(fields) {
  const data = await apiFetch('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  localStorage.setItem('da_user', JSON.stringify(data.user));
  return data.user;
}

export { login, register, logout, isAuthenticated, getCachedUser, fetchUser, updateProfile };
